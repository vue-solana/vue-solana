// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "vue";
import type { SolanaError } from "@vue-solana/core/errors";
import { useTransaction } from "./useTransaction";

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

describe("useTransaction", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("tracks successful transaction execution", async () => {
    const handler = vi.fn().mockResolvedValue("signature");
    const transaction = useTransaction(handler);

    await expect(transaction.execute("arg")).resolves.toBe("signature");

    expect(handler).toHaveBeenCalledWith("arg");
    expect(transaction.signature.value).toBe("signature");
    expect(transaction.loading.value).toBe(false);
    expect(transaction.error.value).toBeNull();
  });

  it("tracks failed transaction execution", async () => {
    const failure = new Error("failed");
    const transaction = useTransaction(vi.fn().mockRejectedValue(failure));

    await expect(transaction.execute()).rejects.toThrow("failed");

    expect(transaction.signature.value).toBeNull();
    expect(transaction.loading.value).toBe(false);
    expect(transaction.error.value?.code).toBe("RPC_FAILURE");
    expect(transaction.error.value?.cause).toBe(failure);
  });

  it("clears loading when a transaction does not settle before its timeout", async () => {
    vi.useFakeTimers();
    const transaction = useTransaction(() => new Promise<string>(() => {}), {
      timeoutMs: 10,
      timeoutMessage: "stale transaction",
    });

    const execution = transaction.execute();
    const rejection = expect(execution).rejects.toThrow("stale transaction");

    expect(transaction.loading.value).toBe(true);

    await vi.advanceTimersByTimeAsync(10);
    await rejection;

    expect(transaction.signature.value).toBeNull();
    expect(transaction.loading.value).toBe(false);
    expect(transaction.error.value).toBeInstanceOf(Error);
    expect((transaction.error.value as SolanaError | null)?.code).toBe("TRANSACTION_TIMEOUT");
  });

  it("does not let an older stale transaction clear newer loading state", async () => {
    vi.useFakeTimers();
    const handler = vi
      .fn<() => Promise<string>>()
      .mockImplementationOnce(() => new Promise<string>(() => {}))
      .mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve("signature"), 8)),
      );
    const transaction = useTransaction(handler, {
      timeoutMs: 10,
      timeoutMessage: "stale transaction",
    });

    const staleExecution = transaction.execute();
    // Superseded executions reject immediately with an abort (their outcome
    // is dropped); the timeout error they would eventually raise is silenced.
    const staleRejection = expect(staleExecution).rejects.toThrow();

    await vi.advanceTimersByTimeAsync(5);

    const nextExecution = transaction.execute();

    await vi.advanceTimersByTimeAsync(5);
    await staleRejection;

    expect(transaction.loading.value).toBe(true);
    expect(transaction.error.value).toBeNull();

    await vi.advanceTimersByTimeAsync(3);
    await expect(nextExecution).resolves.toBe("signature");

    expect(transaction.loading.value).toBe(false);
    expect(transaction.signature.value).toBe("signature");
  });

  it("stops updating refs once the scope is disposed", async () => {
    const pending = deferred<string>();
    const { result, scope } = setupInScope(() => useTransaction(() => pending.promise));

    const execution = result.execute();
    expect(result.loading.value).toBe(true);

    scope.stop();
    pending.resolve("late");

    await execution.catch(() => undefined);

    expect(result.signature.value).toBeNull();
    expect(result.loading.value).toBe(true);
    expect(result.error.value).toBeNull();
  });
});
