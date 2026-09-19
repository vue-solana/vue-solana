// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import type { ReactiveState, ReactiveStreamStore } from "@vue-solana/core/kit";
import { useSubscription } from "./useSubscription";

interface FakeStreamStoreOptions {
  initial?: ReactiveState<string>;
}

interface FakeStreamStore extends ReactiveStreamStore<string> {
  /** Push a value into the stream, as the underlying transport would. */
  publish(value: string, slot: number): void;
  /** Simulate a stream failure. */
  fail(error: unknown): void;
  connectCount(): number;
}

function createFakeStreamStore(options: FakeStreamStoreOptions = {}): FakeStreamStore {
  let state: ReactiveState<string> = options.initial ?? {
    data: undefined,
    error: undefined,
    status: "idle",
  };
  const listeners = new Set<() => void>();
  const connectCalls: AbortSignal[] = [];

  function setState(next: ReactiveState<string>) {
    state = next;
    listeners.forEach((listener) => {
      listener();
    });
  }

  return {
    connect() {
      const controller = new AbortController();
      connectCalls.push(controller.signal);
      setState({ data: state.data, error: undefined, status: "loading" });
    },
    getState: () => state,
    reset() {
      setState({ data: undefined, error: undefined, status: "idle" });
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    withSignal(signal) {
      return {
        connect: () => {
          const controller = new AbortController();
          connectCalls.push(controller.signal);
          setState({ data: state.data, error: undefined, status: "loading" });

          // Mirror the real Kit store: aborting the composed caller signal
          // fails the connection with the abort reason.
          signal.addEventListener(
            "abort",
            () => {
              setState({ data: state.data, error: signal.reason, status: "error" });
            },
            { once: true },
          );
        },
      };
    },
    publish(value: string, slot: number) {
      void slot;
      setState({ data: value, error: undefined, status: "loaded" });
    },
    fail(error: unknown) {
      setState({ data: state.data, error, status: "error" });
    },
    connectCount: () => connectCalls.length,
  };
}

function setup<TResult>(setupFn: () => TResult): {
  result: TResult;
  scope: ReturnType<typeof effectScope>;
} {
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

describe("useSubscription", () => {
  it("connects on mount and reflects loaded values", async () => {
    const store = createFakeStreamStore();
    const source = { reactiveStore: () => store as ReactiveStreamStore<string> };
    const { result } = setup(() => useSubscription(source));

    expect(result.status.value).toBe("loading");

    store.publish("value", 1);

    expect(result.status.value).toBe("loaded");
    expect(result.data.value).toBe("value");
    expect(result.error.value).toBeNull();
  });

  it("reports disabled for a null source and clears state", async () => {
    const store = createFakeStreamStore();
    const source = ref<{ reactiveStore: () => ReactiveStreamStore<string> } | null>({
      reactiveStore: () => store as ReactiveStreamStore<string>,
    });
    const { result } = setup(() => useSubscription(source));

    store.publish("value", 1);
    expect(result.status.value).toBe("loaded");

    source.value = null;
    await nextTick();

    expect(result.status.value).toBe("disabled");
    expect(result.data.value).toBeUndefined();
  });

  it("reconnects on reconnect() and keeps stale data while loading", async () => {
    const store = createFakeStreamStore();
    const source = { reactiveStore: () => store as ReactiveStreamStore<string> };
    const { result } = setup(() => useSubscription(source));

    store.publish("first", 1);
    expect(result.data.value).toBe("first");

    result.reconnect();

    expect(store.connectCount()).toBe(2);
    expect(result.status.value).toBe("loaded");
    expect(result.data.value).toBe("first");

    store.publish("second", 2);
    expect(result.data.value).toBe("second");
  });

  it("re-subscribes to a new source when the source ref changes", async () => {
    const storeA = createFakeStreamStore();
    const storeB = createFakeStreamStore();
    const source = ref<{ reactiveStore: () => ReactiveStreamStore<string> } | null>({
      reactiveStore: () => storeA as ReactiveStreamStore<string>,
    });
    const { result } = setup(() => useSubscription(source));

    storeA.publish("a", 1);
    expect(result.data.value).toBe("a");

    source.value = { reactiveStore: () => storeB as ReactiveStreamStore<string> };
    await nextTick();

    storeB.publish("b", 2);
    expect(result.data.value).toBe("b");

    storeA.publish("stale-a", 1);
    expect(result.data.value).toBe("b");
  });

  it("captures errors while preserving the last known data", async () => {
    const failure = new Error("stream failed");
    const onError = vi.fn();
    const store = createFakeStreamStore();
    const source = { reactiveStore: () => store as ReactiveStreamStore<string> };
    const { result } = setup(() => useSubscription(source, { onError }));

    store.publish("before", 1);
    store.fail(failure);

    expect(result.status.value).toBe("error");
    expect(result.data.value).toBe("before");
    expect(result.error.value?.cause).toBe(failure);
    expect(onError).toHaveBeenCalledWith(failure);
  });

  it("recovers after an error via reconnect()", async () => {
    const store = createFakeStreamStore();
    const source = { reactiveStore: () => store as ReactiveStreamStore<string> };
    const { result } = setup(() => useSubscription(source));

    store.fail(new Error("dropped"));
    expect(result.status.value).toBe("error");

    result.reconnect();
    store.publish("recovered", 2);

    expect(result.status.value).toBe("loaded");
    expect(result.data.value).toBe("recovered");
    expect(result.error.value).toBeNull();
  });

  it("passes the caller signal per connection via getAbortSignal", async () => {
    const controllers: AbortController[] = [];
    const store = createFakeStreamStore();
    const source = { reactiveStore: () => store as ReactiveStreamStore<string> };
    const { result } = setup(() =>
      useSubscription(source, {
        getAbortSignal: () => {
          const controller = new AbortController();
          controllers.push(controller);

          return controller.signal;
        },
      }),
    );

    expect(controllers).toHaveLength(1);

    controllers[0]?.abort(new Error("killed"));

    expect(result.status.value).toBe("error");
    expect(result.error.value?.cause).toBeInstanceOf(Error);
  });

  it("reconnect({ abortSignal }) uses the override and skips getAbortSignal", async () => {
    const factory = vi.fn(() => new AbortController().signal);
    const store = createFakeStreamStore();
    const source = { reactiveStore: () => store as ReactiveStreamStore<string> };
    const { result } = setup(() => useSubscription(source, { getAbortSignal: factory }));

    expect(factory).toHaveBeenCalledTimes(1);

    const override = new AbortController();
    result.reconnect({ abortSignal: override.signal });

    expect(store.connectCount()).toBe(2);
    expect(factory).toHaveBeenCalledTimes(1);

    override.abort(new Error("killed"));

    expect(result.status.value).toBe("error");
  });

  it("reconnect({}) and reconnect({ abortSignal: undefined }) skip getAbortSignal", async () => {
    const factory = vi.fn(() => new AbortController().signal);
    const store = createFakeStreamStore();
    const source = { reactiveStore: () => store as ReactiveStreamStore<string> };
    const { result } = setup(() => useSubscription(source, { getAbortSignal: factory }));

    result.reconnect({});
    result.reconnect({ abortSignal: undefined });

    expect(store.connectCount()).toBe(3);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("applies error state immediately for a pre-aborted reconnect signal", async () => {
    const store = createFakeStreamStore();
    const source = { reactiveStore: () => store as ReactiveStreamStore<string> };
    const { result } = setup(() => useSubscription(source));

    store.publish("first", 1);
    expect(result.data.value).toBe("first");

    const controller = new AbortController();
    controller.abort(new Error("cancel"));
    result.reconnect({ abortSignal: controller.signal });

    expect(result.status.value).toBe("error");
    expect(result.error.value?.cause).toBeInstanceOf(Error);
    expect(store.connectCount()).toBe(1);
  });

  it("disconnects when the scope is disposed", async () => {
    const store = createFakeStreamStore();
    const source = { reactiveStore: () => store as ReactiveStreamStore<string> };
    const { result, scope } = setup(() => useSubscription(source));

    store.publish("value", 1);
    expect(result.data.value).toBe("value");

    scope.stop();

    expect(store.getState().status).toBe("idle");

    store.publish("after-dispose", 2);

    await nextTick();
    expect(result.data.value).toBe("value");
  });

  it("reconnect() after scope dispose does not reopen a leaked connection", () => {
    const store = createFakeStreamStore();
    const source = { reactiveStore: () => store as ReactiveStreamStore<string> };
    const { result, scope } = setup(() => useSubscription(source));

    const connectsBeforeDispose = store.connectCount();

    scope.stop();
    result.reconnect();

    expect(store.connectCount()).toBe(connectsBeforeDispose);
    expect(store.getState().status).toBe("idle");
  });
});
