// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import type {
  ReactiveActionSource,
  ReactiveActionState,
  ReactiveActionStore,
  ReactiveState,
  ReactiveStreamSource,
  ReactiveStreamStore,
  SolanaRpcResponse,
} from "@vue-solana/core/kit";
import { clearSwrCache, useTrackedDataSwr } from "../swr";
import { useTrackedData } from "./useTrackedData";

interface FakeNotification {
  lamports: bigint;
}

interface FakeActionSource extends ReactiveActionSource<SolanaRpcResponse<bigint>> {
  resolve(value: bigint, slot: number): void;
  reject(error: unknown): void;
}

interface FakeStreamSource extends ReactiveStreamSource<SolanaRpcResponse<FakeNotification>> {
  notify(value: FakeNotification, slot: number): void;
  fail(error: unknown): void;
  connectCount(): number;
}

function createFakeActionSource(): FakeActionSource {
  const listeners = new Set<() => void>();
  let state: ReactiveActionState<SolanaRpcResponse<bigint>> = {
    data: undefined,
    error: undefined,
    status: "idle",
  };

  function emit() {
    listeners.forEach((listener) => {
      listener();
    });
  }

  function dispatch() {
    state = { data: undefined, error: undefined, status: "running" };
    emit();
  }

  const innerStore: ReactiveActionStore<[], SolanaRpcResponse<bigint>> = {
    dispatch,
    dispatchAsync: () => Promise.reject(new Error("not implemented in test fake")),
    getState: () => state,
    reset: () => {
      state = { data: undefined, error: undefined, status: "idle" };
      emit();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    withSignal() {
      return { dispatch };
    },
  } as unknown as ReactiveActionStore<[], SolanaRpcResponse<bigint>>;

  return {
    ...innerStore,
    reactiveStore: () => innerStore,
    resolve(value: bigint, slot: number) {
      state = {
        data: { context: { slot: BigInt(slot) }, value },
        error: undefined,
        status: "success",
      };
      emit();
    },
    reject(error: unknown) {
      state = { data: undefined, error, status: "error" };
      emit();
    },
  };
}

function createFakeStreamSource(): FakeStreamSource {
  const listeners = new Set<() => void>();
  let state: ReactiveState<SolanaRpcResponse<FakeNotification>> = {
    data: undefined,
    error: undefined,
    status: "idle",
  };
  let connects = 0;
  const innerStore: ReactiveStreamStore<SolanaRpcResponse<FakeNotification>> = {
    connect: () => {
      innerConnect();
    },
    getState: () => state,
    reset: () => {
      state = { data: undefined, error: undefined, status: "idle" };
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    withSignal() {
      return { connect: () => innerConnect() };
    },
  };

  function innerConnect() {
    connects += 1;
    state = { data: state.data, error: undefined, status: "loading" };
    emit();
  }

  function emit() {
    listeners.forEach((listener) => {
      listener();
    });
  }

  return {
    ...innerStore,
    reactiveStore: () => innerStore,
    notify(value: FakeNotification, slot: number) {
      state = {
        data: { context: { slot: BigInt(slot) }, value },
        error: undefined,
        status: "loaded",
        // Slot-tracking stores tag loaded states with the slot context.
      } as ReactiveState<SolanaRpcResponse<FakeNotification>>;
      emit();
    },
    fail(error: unknown) {
      state = { data: state.data, error, status: "error" };
      emit();
    },
    connectCount: () => connects,
  };
}

function setup<TResult>(setupFn: () => TResult) {
  let result: TResult | undefined;
  const scope = effectScope();

  scope.run(() => {
    result = setupFn();
  });

  if (!result) {
    throw new Error("setup did not initialize a result");
  }

  return { result, scope };
}

describe("useTrackedData", () => {
  it("hydrates from the fetch and updates from the subscription", () => {
    const actionSource = createFakeActionSource();
    const streamSource = createFakeStreamSource();
    const { result } = setup(() =>
      useTrackedData<bigint, FakeNotification, bigint>({
        rpcRequest: actionSource,
        rpcValueMapper: (lamports) => lamports,
        rpcSubscriptionRequest: streamSource,
        rpcSubscriptionValueMapper: ({ lamports }) => lamports,
      }),
    );

    actionSource.resolve(100n, 1);

    expect(result.status.value).toBe("loaded");
    expect(result.data.value?.value).toBe(100n);
    expect(result.data.value?.context.slot).toBe(1n);

    streamSource.notify({ lamports: 200n }, 3);

    expect(result.data.value?.value).toBe(200n);
    expect(result.data.value?.context.slot).toBe(3n);
  });

  it("slot-dedupes out-of-order arrivals (no regression to older slots)", () => {
    const actionSource = createFakeActionSource();
    const streamSource = createFakeStreamSource();
    const { result } = setup(() =>
      useTrackedData<bigint, FakeNotification, bigint>({
        rpcRequest: actionSource,
        rpcValueMapper: (lamports) => lamports,
        rpcSubscriptionRequest: streamSource,
        rpcSubscriptionValueMapper: ({ lamports }) => lamports,
      }),
    );

    streamSource.notify({ lamports: 300n }, 10);
    // A stale fetch response arriving late must not regress the data.
    actionSource.resolve(100n, 5);

    expect(result.data.value?.value).toBe(300n);
    expect(result.data.value?.context.slot).toBe(10n);
  });

  it("preserves the last known data on errors from either source", () => {
    const actionSource = createFakeActionSource();
    const streamSource = createFakeStreamSource();
    const onError = vi.fn();
    const { result } = setup(() =>
      useTrackedData<bigint, FakeNotification, bigint>(
        {
          rpcRequest: actionSource,
          rpcValueMapper: (lamports) => lamports,
          rpcSubscriptionRequest: streamSource,
          rpcSubscriptionValueMapper: ({ lamports }) => lamports,
        },
        { onError },
      ),
    );

    actionSource.resolve(100n, 1);
    streamSource.fail(new Error("stream dropped"));

    expect(result.status.value).toBe("error");
    expect(result.data.value?.value).toBe(100n);
    expect(result.error.value?.cause).toBeInstanceOf(Error);
    expect(onError).toHaveBeenCalled();
  });

  it("refresh() re-runs both sources with stale-while-revalidate", () => {
    const actionSource = createFakeActionSource();
    const streamSource = createFakeStreamSource();
    const { result } = setup(() =>
      useTrackedData<bigint, FakeNotification, bigint>({
        rpcRequest: actionSource,
        rpcValueMapper: (lamports) => lamports,
        rpcSubscriptionRequest: streamSource,
        rpcSubscriptionValueMapper: ({ lamports }) => lamports,
      }),
    );

    actionSource.resolve(100n, 1);
    expect(result.data.value?.value).toBe(100n);

    result.refresh();

    expect(streamSource.connectCount()).toBe(2);
    expect(result.status.value).toBe("loaded");
    expect(result.data.value?.value).toBe(100n);

    actionSource.resolve(500n, 2);
    expect(result.data.value?.value).toBe(500n);
  });

  it("reports disabled and clears state for a null rpcRequest ref", async () => {
    const streamSource = createFakeStreamSource();
    const rpcRequest = ref<ReactiveActionSource<SolanaRpcResponse<bigint>> | null>(
      createFakeActionSource(),
    );
    const { result } = setup(() =>
      useTrackedData<bigint, FakeNotification, bigint>({
        rpcRequest,
        rpcValueMapper: (lamports) => lamports,
        rpcSubscriptionRequest: streamSource,
        rpcSubscriptionValueMapper: ({ lamports }) => lamports,
      }),
    );

    expect(result.status.value).toBe("loading");

    rpcRequest.value = null;
    await nextTick();

    expect(result.status.value).toBe("disabled");
    expect(result.data.value).toBeUndefined();
  });

  it("reconnects when a ref source changes identity", async () => {
    const actionSourceA = createFakeActionSource();
    const actionSourceB = createFakeActionSource();
    const streamSource = createFakeStreamSource();
    const rpcRequest = ref<ReactiveActionSource<SolanaRpcResponse<bigint>>>(actionSourceA);
    const { result } = setup(() =>
      useTrackedData<bigint, FakeNotification, bigint>({
        rpcRequest,
        rpcValueMapper: (lamports) => lamports,
        rpcSubscriptionRequest: streamSource,
        rpcSubscriptionValueMapper: ({ lamports }) => lamports,
      }),
    );

    actionSourceA.resolve(100n, 1);
    expect(result.data.value?.value).toBe(100n);

    rpcRequest.value = actionSourceB;
    await nextTick();

    actionSourceB.resolve(700n, 4);

    expect(result.data.value?.value).toBe(700n);
    expect(result.data.value?.context.slot).toBe(4n);
  });

  it("refresh({ abortSignal }) uses the override and skips getAbortSignal", () => {
    const factory = vi.fn(() => new AbortController().signal);
    const actionSource = createFakeActionSource();
    const streamSource = createFakeStreamSource();
    const { result } = setup(() =>
      useTrackedData<bigint, FakeNotification, bigint>(
        {
          rpcRequest: actionSource,
          rpcValueMapper: (lamports) => lamports,
          rpcSubscriptionRequest: streamSource,
          rpcSubscriptionValueMapper: ({ lamports }) => lamports,
        },
        { getAbortSignal: factory },
      ),
    );

    expect(factory).toHaveBeenCalledTimes(1);

    result.refresh({ abortSignal: new AbortController().signal });

    expect(streamSource.connectCount()).toBe(2);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("refresh({}) and refresh({ abortSignal: undefined }) skip getAbortSignal", () => {
    const factory = vi.fn(() => new AbortController().signal);
    const actionSource = createFakeActionSource();
    const streamSource = createFakeStreamSource();
    const { result } = setup(() =>
      useTrackedData<bigint, FakeNotification, bigint>(
        {
          rpcRequest: actionSource,
          rpcValueMapper: (lamports) => lamports,
          rpcSubscriptionRequest: streamSource,
          rpcSubscriptionValueMapper: ({ lamports }) => lamports,
        },
        { getAbortSignal: factory },
      ),
    );

    result.refresh({});
    result.refresh({ abortSignal: undefined });

    expect(streamSource.connectCount()).toBe(3);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("applies error state immediately for a pre-aborted refresh signal", () => {
    const actionSource = createFakeActionSource();
    const streamSource = createFakeStreamSource();
    const { result } = setup(() =>
      useTrackedData<bigint, FakeNotification, bigint>({
        rpcRequest: actionSource,
        rpcValueMapper: (lamports) => lamports,
        rpcSubscriptionRequest: streamSource,
        rpcSubscriptionValueMapper: ({ lamports }) => lamports,
      }),
    );

    const controller = new AbortController();
    controller.abort(new Error("cancel"));
    result.refresh({ abortSignal: controller.signal });

    expect(result.status.value).toBe("error");
    expect(result.error.value?.cause).toBeInstanceOf(Error);
    expect(streamSource.connectCount()).toBe(1);
  });

  it("refresh() after scope dispose is a no-op (no leaked reconnect)", () => {
    const actionSource = createFakeActionSource();
    const streamSource = createFakeStreamSource();
    const { result, scope } = setup(() =>
      useTrackedData<bigint, FakeNotification, bigint>({
        rpcRequest: actionSource,
        rpcValueMapper: (lamports) => lamports,
        rpcSubscriptionRequest: streamSource,
        rpcSubscriptionValueMapper: ({ lamports }) => lamports,
      }),
    );

    const connectsBeforeDispose = streamSource.connectCount();

    scope.stop();
    result.refresh();

    expect(streamSource.connectCount()).toBe(connectsBeforeDispose);
  });
});

describe("useTrackedDataSwr", () => {
  it("seeds the last-known envelope and clears the entry when disabled", async () => {
    clearSwrCache();
    const firstAction = createFakeActionSource();
    const firstStream = createFakeStreamSource();
    const first = setup(() =>
      useTrackedDataSwr<bigint, FakeNotification, bigint>("balance", {
        rpcRequest: firstAction,
        rpcValueMapper: (lamports) => lamports,
        rpcSubscriptionRequest: firstStream,
        rpcSubscriptionValueMapper: ({ lamports }) => lamports,
      }),
    );

    firstAction.resolve(100n, 1);
    expect(first.result.data.value?.value).toBe(100n);
    first.scope.stop();

    // A second mount seeds the cached envelope before its own revalidation.
    const rpcRequest = ref<ReactiveActionSource<SolanaRpcResponse<bigint>> | null>(
      createFakeActionSource(),
    );
    const second = setup(() =>
      useTrackedDataSwr<bigint, FakeNotification, bigint>("balance", {
        rpcRequest,
        rpcValueMapper: (lamports) => lamports,
        rpcSubscriptionRequest: createFakeStreamSource(),
        rpcSubscriptionValueMapper: ({ lamports }) => lamports,
      }),
    );

    expect(second.result.data.value?.value).toBe(100n);
    expect(second.result.data.value?.context.slot).toBe(1n);

    rpcRequest.value = null;
    await nextTick();

    expect(second.result.status.value).toBe("disabled");
    second.scope.stop();

    // Disabling cleared the entry, so a third mount starts empty.
    const third = setup(() =>
      useTrackedDataSwr<bigint, FakeNotification, bigint>("balance", {
        rpcRequest: createFakeActionSource(),
        rpcValueMapper: (lamports) => lamports,
        rpcSubscriptionRequest: createFakeStreamSource(),
        rpcSubscriptionValueMapper: ({ lamports }) => lamports,
      }),
    );

    expect(third.result.data.value).toBeUndefined();
    third.scope.stop();
  });
});
