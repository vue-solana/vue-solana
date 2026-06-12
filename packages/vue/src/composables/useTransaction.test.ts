import { afterEach, describe, expect, it, vi } from "vitest";
import { useTransaction } from "./useTransaction";

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
    expect(transaction.error.value).toBe(failure);
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
    const staleRejection = expect(staleExecution).rejects.toThrow("stale transaction");

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
});
