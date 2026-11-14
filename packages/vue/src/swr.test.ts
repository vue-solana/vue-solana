// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import type { ReactiveState, ReactiveStreamStore } from "@vue-solana/core/kit";
import { clearSwrCache, deleteSwrKey, useRequestSwr, useSubscriptionSwr } from "./swr";

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

describe("deleteSwrKey", () => {
  it("removes a single cached SWR entry", async () => {
    clearSwrCache();
    const first = runInScope(() => useRequestSwr<string>("drop-me", async () => "value"));

    await vi.waitFor(() => {
      expect(first.result.data.value).toBe("value");
    });
    first.scope.stop();

    deleteSwrKey("request:drop-me");

    const second = runInScope(() => useRequestSwr<string>("drop-me", async () => "fresh"));
    expect(second.result.data.value).toBeUndefined();
    second.scope.stop();
  });
});

describe("SWR cache size cap", () => {
  // The cap (1024 entries, oldest-first) is only observable through mounts:
  // `swrCache` is module-private, so each case seeds it with real keys and then
  // probes whether a key still seeds. The seeding mounts in one batch and waits
  // once, so the cases stay well under the default 5 s test timeout.
  const MAX_ENTRIES = 1024;

  async function mountAll(keys: string[]) {
    const mounted = keys.map((key) =>
      runInScope(() => useRequestSwr<string>(key, async () => `value-${key}`)),
    );

    await vi.waitFor(() => {
      const last = mounted.at(-1);

      // Assert the composable's own status, not `data`: a key that already has
      // a cached seed reports data immediately, so waiting on data would return
      // before this mount's write-back (the thing under test) happens.
      expect(last?.result.status.value).toBe("success");
      expect(last?.result.data.value).toBe(`value-${keys.at(-1)}`);
    });

    return mounted;
  }

  function mountPending(key: string) {
    return runInScope(() => useRequestSwr<string>(key, () => new Promise<string>(() => undefined)));
  }

  it("evicts the oldest entry once the cache exceeds its size cap", async () => {
    clearSwrCache();

    const keys = Array.from({ length: MAX_ENTRIES + 1 }, (_, index) => `capped-${index}`);
    const mounted = await mountAll(keys);
    mounted.forEach((entry) => entry.scope.stop());

    // `capped-0` was the oldest write, so the 1025th insert evicted it.
    const evicted = mountPending("capped-0");
    expect(evicted.result.data.value).toBeUndefined();
    evicted.scope.stop();

    // The newest write is still cached.
    const cached = mountPending(`capped-${MAX_ENTRIES}`);
    expect(cached.result.data.value).toBe(`value-capped-${MAX_ENTRIES}`);
    cached.scope.stop();
  });

  it("keeps a rewritten key alive by refreshing its insertion order", async () => {
    clearSwrCache();

    const keys = Array.from({ length: MAX_ENTRIES }, (_, index) => `ordered-${index}`);
    (await mountAll(keys)).forEach((entry) => entry.scope.stop());

    // Re-writing an existing key must move it to the newest position.
    (await mountAll(["ordered-0"])).forEach((entry) => entry.scope.stop());

    // One more key overflows the cap and evicts the oldest *remaining* entry,
    // which is `ordered-1` only if the rewrite moved `ordered-0`.
    (await mountAll([`ordered-${MAX_ENTRIES}`])).forEach((entry) => entry.scope.stop());

    const rewritten = mountPending("ordered-0");
    expect(rewritten.result.data.value).toBe("value-ordered-0");
    rewritten.scope.stop();

    const evicted = mountPending("ordered-1");
    expect(evicted.result.data.value).toBeUndefined();
    evicted.scope.stop();
  });
});
