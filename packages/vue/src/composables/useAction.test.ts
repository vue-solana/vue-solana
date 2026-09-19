// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { effectScope, ref } from "vue";
import { useAction } from "./useAction";

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

function setupInScope<TResult>(setup: () => TResult): {
  result: TResult;
  scope: ReturnType<typeof effectScope>;
} {
  let result: TResult | undefined;
  const scope = effectScope();

  scope.run(() => {
    result = setup();
  });

  if (!result) {
    throw new Error("setup did not initialize a result");
  }

  return { result, scope };
}

describe("useAction", () => {
  it("starts idle and resolves dispatch with the handler result", async () => {
    const handler = vi.fn(async () => 42);
    const { result } = setupInScope(() => useAction(handler));

    expect(result.status.value).toBe("idle");
    expect(result.data.value).toBeUndefined();

    await expect(result.dispatch()).resolves.toBe(42);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(result.status.value).toBe("success");
    expect(result.data.value).toBe(42);
    expect(result.error.value).toBeUndefined();
    expect(result.isRunning.value).toBe(false);
  });

  it("passes a fresh AbortSignal to each dispatch and aborts on redispatch", async () => {
    const signals: AbortSignal[] = [];
    const first = deferred<string>();
    const second = deferred<string>();
    const { result } = setupInScope(() =>
      useAction((signal: AbortSignal) => {
        signals.push(signal);

        return signals.length === 1 ? first.promise : second.promise;
      }),
    );

    const firstDispatch = result.dispatch();
    const firstSignal = signals[0];
    expect(firstSignal).toBeDefined();

    const secondDispatch = result.dispatch();
    expect(firstSignal?.aborted).toBe(true);

    second.resolve("second");
    await expect(secondDispatch).resolves.toBe("second");
    await expect(firstDispatch).rejects.toSatisfy((error: unknown) => error instanceof Error);

    expect(result.data.value).toBe("second");
    expect(signals).toHaveLength(2);
    expect(signals[1]?.aborted).toBe(false);
  });

  it("captures errors on state and rethrows from dispatch", async () => {
    const failure = new Error("action failed");
    const onError = vi.fn();
    const { result } = setupInScope(() =>
      useAction(
        async () => {
          throw failure;
        },
        { onError },
      ),
    );

    await expect(result.dispatch()).rejects.toBe(failure);

    expect(result.status.value).toBe("error");
    expect(result.error.value).toBe(failure);
    expect(onError).toHaveBeenCalledWith(failure);
  });

  it("keeps the previous data while a redispatch is running", async () => {
    const first = deferred<number>();
    const second = deferred<number>();
    let call = 0;
    const { result } = setupInScope(() =>
      useAction(() => {
        call += 1;

        return call === 1 ? first.promise : second.promise;
      }),
    );

    const firstDispatch = result.dispatch();
    first.resolve(1);
    await firstDispatch;
    expect(result.data.value).toBe(1);

    const secondDispatch = result.dispatch();
    expect(result.status.value).toBe("running");
    expect(result.data.value).toBe(1);

    second.resolve(2);
    await secondDispatch;
    expect(result.data.value).toBe(2);
  });

  it("always invokes the latest handler closure", async () => {
    const multiplier = ref(1);
    const calls: number[] = [];
    const { result } = setupInScope(() =>
      useAction(async () => {
        calls.push(multiplier.value);

        return multiplier.value;
      }),
    );

    multiplier.value = 10;
    await expect(result.dispatch()).resolves.toBe(10);
    expect(calls).toEqual([10]);
  });

  it("supports a ref handler and reads the newest one per dispatch", async () => {
    const handlerOne = vi.fn(async () => "one");
    const handlerTwo = vi.fn(async () => "two");
    const handler = ref(handlerOne);
    const { result } = setupInScope(() => useAction(handler));

    await expect(result.dispatch()).resolves.toBe("one");
    expect(handlerOne).toHaveBeenCalledTimes(1);

    handler.value = handlerTwo;
    await expect(result.dispatch()).resolves.toBe("two");
    expect(handlerTwo).toHaveBeenCalledTimes(1);
    expect(handlerOne).toHaveBeenCalledTimes(1);
  });

  it("reset returns the state to idle", async () => {
    const { result } = setupInScope(() => useAction(async () => "value"));

    await result.dispatch();
    expect(result.status.value).toBe("success");

    result.reset();

    expect(result.status.value).toBe("idle");
    expect(result.data.value).toBeUndefined();
  });

  it("stops tracking state after the scope is disposed", async () => {
    const { result, scope } = setupInScope(() => useAction(async () => "idle"));

    scope.stop();

    await expect(result.dispatch()).resolves.toBe("idle");
    expect(result.status.value).toBe("idle");
  });

  it("aborts an in-flight dispatch when the scope is disposed", async () => {
    const signals: AbortSignal[] = [];
    const pending = deferred<string>();
    const { result, scope } = setupInScope(() =>
      useAction((signal: AbortSignal) => {
        signals.push(signal);

        return pending.promise;
      }),
    );

    const dispatch = result.dispatch();
    expect(signals[0]?.aborted).toBe(false);

    scope.stop();

    expect(signals[0]?.aborted).toBe(true);
    await expect(dispatch).rejects.toSatisfy((error: unknown) => error instanceof Error);
  });
});
