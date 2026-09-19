// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import type { ReactiveState, ReactiveStreamStore } from "@vue-solana/core/kit";
import { clearSwrCache, useRequestSwr, useSubscriptionSwr } from "./swr";

function runInScope<T>(setupFn: () => T): { result: T; scope: ReturnType<typeof effectScope> } {
  let result: T | undefined;
  const scope = effectScope();

  scope.run(() => {
    result = setupFn();
  });

  if (!result) {
    throw new Error("setup did not initialize a result");
  }

  return { result, scope };
}

describe("useRequestSwr", () => {
  it("seeds a new mount from the previous mount's cached data", async () => {
    clearSwrCache();
    let resolveFirst!: (value: string) => void;
    const first = runInScope(() =>
      useRequestSwr<string>("balance", async () => {
        return new Promise<string>((resolve) => {
          resolveFirst = resolve;
        });
      }),
    );

    expect(first.result.data.value).toBeUndefined();

    resolveFirst("first-value");
    await vi.waitFor(() => {
      expect(first.result.data.value).toBe("first-value");
    });
    first.scope.stop();

    // Second mount with the same key sees the cached value immediately,
    // while its own (never-resolving) request revalidates.
    let resolveSecond!: (value: string) => void;
    const second = runInScope(() =>
      useRequestSwr<string>("balance", async () => {
        return new Promise<string>((resolve) => {
          resolveSecond = resolve;
        });
      }),
    );

    expect(second.result.data.value).toBe("first-value");
    expect(second.result.status.value).toBe("fetching");

    resolveSecond("second-value");
    await vi.waitFor(() => {
      expect(second.result.data.value).toBe("second-value");
    });
    second.scope.stop();
  });

  it("keys requests independently", async () => {
    clearSwrCache();
    const first = runInScope(() => useRequestSwr<string>("a", async () => "value-a"));

    await vi.waitFor(() => {
      expect(first.result.data.value).toBe("value-a");
    });
    first.scope.stop();

    const second = runInScope(() => useRequestSwr<string>("b", async () => "value-b"));

    await vi.waitFor(() => {
      expect(second.result.data.value).toBe("value-b");
    });
    expect(second.result.data.value).not.toBe("value-a");
    second.scope.stop();
  });

  it("clears the cached entry when the source becomes null (disabled)", async () => {
    clearSwrCache();
    const source = ref<((signal: AbortSignal) => Promise<string>) | null>(async () => "data");
    const first = runInScope(() => useRequestSwr<string>("toggle", source));

    await vi.waitFor(() => {
      expect(first.result.data.value).toBe("data");
    });
    first.scope.stop();

    const source2 = ref<((signal: AbortSignal) => Promise<string>) | null>(async () => "fresh");
    const second = runInScope(() => useRequestSwr<string>("toggle", source2));

    source2.value = null;
    await nextTick();

    expect(second.result.status.value).toBe("disabled");
    second.scope.stop();

    // A third mount finds no cached entry (it was cleared on disable).
    const third = runInScope(() => useRequestSwr<string>("toggle", async () => "new"));

    expect(third.result.data.value).toBeUndefined();
    third.scope.stop();
  });

  it("seeds but then clears a previous mount's error once the fresh attempt succeeds", async () => {
    clearSwrCache();
    const failing = runInScope(() =>
      useRequestSwr<string>("retry", async () => {
        throw new Error("boom");
      }),
    );

    await vi.waitFor(() => {
      expect(failing.result.status.value).toBe("error");
    });
    expect(failing.result.error.value).not.toBeNull();
    failing.scope.stop();

    let resolveSecond!: (value: string) => void;
    const second = runInScope(() =>
      useRequestSwr<string>(
        "retry",
        () =>
          new Promise<string>((resolve) => {
            resolveSecond = resolve;
          }),
      ),
    );

    // The seeded error is shown while the new attempt is still in flight...
    expect(second.result.error.value).not.toBeNull();
    expect(second.result.status.value).toBe("fetching");

    resolveSecond("ok");

    // ...and is cleared once this mount succeeds instead of sticking forever.
    await vi.waitFor(() => {
      expect(second.result.status.value).toBe("success");
    });
    expect(second.result.error.value).toBeNull();
    second.scope.stop();
  });

  it("does not erase the last-known-good cached data when an attempt errors", async () => {
    clearSwrCache();
    const good = runInScope(() => useRequestSwr<string>("keep", async () => "good"));

    await vi.waitFor(() => {
      expect(good.result.data.value).toBe("good");
    });
    good.scope.stop();

    const failing = runInScope(() =>
      useRequestSwr<string>("keep", async () => {
        throw new Error("boom");
      }),
    );

    await vi.waitFor(() => {
      expect(failing.result.status.value).toBe("error");
    });
    expect(failing.result.data.value).toBe("good");
    failing.scope.stop();

    // The next mount still seeds the last known good value from the cache.
    const third = runInScope(() => useRequestSwr<string>("keep", async () => "fresh"));

    expect(third.result.data.value).toBe("good");
    third.scope.stop();
  });
});

describe("useSubscriptionSwr", () => {
  function createFakeStreamStore() {
    const listeners = new Set<() => void>();
    let state: ReactiveState<string> = { data: undefined, error: undefined, status: "idle" };

    return {
      connect: vi.fn(() => {
        state = { data: state.data, error: undefined, status: "loading" };
        listeners.forEach((listener) => {
          listener();
        });
      }),
      getState: () => state,
      reset: vi.fn(() => {
        state = { data: undefined, error: undefined, status: "idle" };
        listeners.forEach((listener) => {
          listener();
        });
      }),
      subscribe(listener: () => void) {
        listeners.add(listener);

        return () => {
          listeners.delete(listener);
        };
      },
      withSignal() {
        return { connect: () => undefined };
      },
      publish(value: string) {
        state = { data: value, error: undefined, status: "loaded" };
        listeners.forEach((listener) => {
          listener();
        });
      },
    };
  }

  it("seeds a new mount from the previous mount's cached stream value", () => {
    clearSwrCache();
    const store = createFakeStreamStore();
    const source = { reactiveStore: () => store as unknown as ReactiveStreamStore<string> };
    const first = runInScope(() => useSubscriptionSwr<string>("account", source));

    store.publish("stream-value");
    expect(first.result.data.value).toBe("stream-value");
    first.scope.stop();

    const second = runInScope(() => useSubscriptionSwr<string>("account", source));

    // Seeded immediately from cache while the new subscription connects.
    expect(second.result.data.value).toBe("stream-value");
    second.scope.stop();
  });

  it("clears the cached entry when the source becomes null (disabled)", async () => {
    clearSwrCache();
    const store = createFakeStreamStore();
    const source = ref<{ reactiveStore: () => ReactiveStreamStore<string> } | null>({
      reactiveStore: () => store as unknown as ReactiveStreamStore<string>,
    });
    const first = runInScope(() => useSubscriptionSwr<string>("toggleable", source));

    store.publish("live");
    first.scope.stop();

    source.value = null;
    await nextTick();

    const second = runInScope(() => useSubscriptionSwr<string>("toggleable", source));

    expect(second.result.status.value).toBe("disabled");
    expect(second.result.data.value).toBeUndefined();
    second.scope.stop();
  });
});
