// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { computed, effectScope, ref } from "vue";
import { useRequest } from "./useRequest";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
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

describe("useRequest", () => {
  it("fetches immediately outside a component and exposes success state", async () => {
    const source = vi.fn(async () => 7);
    const { result } = setup(() => useRequest(() => source()));

    expect(result.status.value).toBe("fetching");

    await vi.waitFor(() => {
      expect(result.status.value).toBe("success");
    });

    expect(result.data.value).toBe(7);
    expect(result.error.value).toBeNull();
    expect(source).toHaveBeenCalledTimes(1);
  });

  it("re-fires when a computed source identity changes", async () => {
    const sourceA = vi.fn(async () => "a");
    const sourceB = vi.fn(async () => "b");
    const which = ref(true);
    const source = computed(() => (which.value ? sourceA : sourceB));
    const { result } = setup(() => useRequest(source));

    await vi.waitFor(() => {
      expect(result.data.value).toBe("a");
    });

    which.value = false;

    await vi.waitFor(() => {
      expect(result.data.value).toBe("b");
    });

    expect(sourceA).toHaveBeenCalledTimes(1);
    expect(sourceB).toHaveBeenCalledTimes(1);
  });

  it("keeps prior data while a refresh runs (stale-while-revalidate)", async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    let call = 0;
    const { result } = setup(() =>
      useRequest(() => {
        call += 1;

        return call === 1 ? first.promise : second.promise;
      }),
    );

    first.resolve("stale");
    await vi.waitFor(() => {
      expect(result.data.value).toBe("stale");
    });

    const refreshed = result.refresh();
    expect(result.status.value).toBe("fetching");
    expect(result.data.value).toBe("stale");

    second.resolve("fresh");
    await expect(refreshed).resolves.toBe("fresh");
    expect(result.data.value).toBe("fresh");
  });

  it("refresh resolves with the new value and re-fires the source", async () => {
    let call = 0;
    const { result } = setup(() =>
      useRequest(() => {
        call += 1;

        return Promise.resolve(call);
      }),
    );

    await vi.waitFor(() => {
      expect(result.data.value).toBe(1);
    });

    await expect(result.refresh()).resolves.toBe(2);
    expect(result.data.value).toBe(2);
  });

  it("captures errors on state and rejects refresh", async () => {
    const failure = new Error("rpc down");
    const { result } = setup(() =>
      useRequest(async () => {
        throw failure;
      }),
    );

    await vi.waitFor(() => {
      expect(result.status.value).toBe("error");
    });

    expect(result.error.value?.cause).toBe(failure);

    await expect(result.refresh()).rejects.toSatisfy((error: unknown) => error instanceof Error);
  });

  it("reports disabled for a null source and never calls it", async () => {
    const source = vi.fn(async () => "value");
    const sourceRef = ref<(() => Promise<string>) | null>(source);
    const { result } = setup(() => useRequest(sourceRef));

    await vi.waitFor(() => {
      expect(result.data.value).toBe("value");
    });

    sourceRef.value = null;

    await vi.waitFor(() => {
      expect(result.status.value).toBe("disabled");
    });

    expect(result.data.value).toBeUndefined();
    expect(result.error.value).toBeNull();
  });

  it("reports disabled when created with a null source", async () => {
    const { result } = setup(() => useRequest<string>(null));

    expect(result.status.value).toBe("disabled");
    expect(result.data.value).toBeUndefined();
  });

  it("aborts the in-flight attempt and disables without an error flash when the source flips to null mid-flight", async () => {
    let firstSignal: AbortSignal | undefined;
    const never = new Promise<string>(() => {});
    const sourceA = vi.fn((signal: AbortSignal) => {
      firstSignal = signal;

      return never;
    });
    const source = ref<((signal: AbortSignal) => Promise<string>) | null>(sourceA);
    const { result } = setup(() => useRequest(source));

    await vi.waitFor(() => {
      expect(sourceA).toHaveBeenCalled();
    });

    source.value = null;

    await vi.waitFor(() => {
      expect(result.status.value).toBe("disabled");
    });

    // The running attempt is torn down so its stale result cannot repopulate
    // state, and no error is ever surfaced for the disabled state.
    expect(firstSignal?.aborted).toBe(true);
    expect(result.data.value).toBeUndefined();
    expect(result.error.value).toBeNull();
  });

  it("aborts a superseded attempt when the source changes mid-flight", async () => {
    const signals: AbortSignal[] = [];
    const first = deferred<string>();
    const second = deferred<string>();
    const sourceA = (signal: AbortSignal) => {
      signals.push(signal);

      return first.promise;
    };
    const sourceB = (signal: AbortSignal) => {
      signals.push(signal);

      return second.promise;
    };
    const source = ref<typeof sourceA | typeof sourceB>(sourceA);
    const { result } = setup(() => useRequest(source));

    expect(result.status.value).toBe("fetching");
    expect(signals[0]).toBeDefined();

    source.value = sourceB;

    await vi.waitFor(() => {
      expect(signals).toHaveLength(2);
    });

    expect(signals[0]?.aborted).toBe(true);

    second.resolve("b");
    await vi.waitFor(() => {
      expect(result.data.value).toBe("b");
    });

    first.resolve("stale-a");
    expect(result.data.value).toBe("b");
    expect(signals).toHaveLength(2);
  });

  it("composes getAbortSignal so a timeout fails the attempt", async () => {
    const { result } = setup(() =>
      useRequest(() => new Promise<string>(() => {}), {
        getAbortSignal: () => AbortSignal.timeout(5),
      }),
    );

    await vi.waitFor(
      () => {
        expect(result.status.value).toBe("error");
      },
      { timeout: 2_000 },
    );

    expect(result.error.value).toBeInstanceOf(Error);
  });

  it("accepts a Kit-style request object with send({ abortSignal })", async () => {
    const send = vi.fn((options?: { abortSignal?: AbortSignal }) =>
      Promise.resolve(options?.abortSignal instanceof AbortSignal),
    );
    const { result } = setup(() => useRequest({ send }));

    await vi.waitFor(() => {
      expect(result.data.value).toBe(true);
    });

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0]?.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it("sends a returned Kit-style request object with the attempt signal", async () => {
    const send = vi.fn((options?: { abortSignal?: AbortSignal }) =>
      Promise.resolve(options?.abortSignal instanceof AbortSignal),
    );
    const { result } = setup(() => useRequest(() => ({ send })));

    await vi.waitFor(() => {
      expect(result.data.value).toBe(true);
    });

    expect(send).toHaveBeenCalledTimes(1);
  });

  it("stops tracking after the scope is disposed", async () => {
    const source = vi.fn(async () => 1);
    const { result, scope } = setup(() => useRequest(source));

    await vi.waitFor(() => {
      expect(result.data.value).toBe(1);
    });

    scope.stop();
    await expect(result.refresh()).resolves.toBeUndefined();
    expect(source).toHaveBeenCalledTimes(1);
  });
});
