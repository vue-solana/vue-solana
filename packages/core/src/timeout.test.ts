import { afterEach, describe, expect, it, vi } from "vitest";
import { SolanaError } from "./errors";
import { withSolanaTimeout, withTimeout } from "./timeout";

describe("withTimeout", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the original promise when no timeout is configured", async () => {
    const promise = Promise.resolve("result");
    const result = withTimeout(promise, undefined, () => new Error("timed out"));

    expect(result).toBe(promise);
    await expect(result).resolves.toBe("result");
  });

  it("resolves with the promise result before the timeout", async () => {
    vi.useFakeTimers();

    const promise = new Promise<string>((resolve) => {
      setTimeout(() => resolve("result"), 5);
    });
    const result = withTimeout(promise, 10, () => new Error("timed out"));

    await vi.advanceTimersByTimeAsync(5);

    await expect(result).resolves.toBe("result");
  });

  it("rejects with the provided timeout error", async () => {
    vi.useFakeTimers();

    const result = withTimeout(
      new Promise<string>(() => undefined),
      10,
      () => new Error("timed out"),
    );
    const rejection = expect(result).rejects.toThrow("timed out");

    await vi.advanceTimersByTimeAsync(10);

    await rejection;
  });

  it("times out immediately when timeoutMs is 0", async () => {
    vi.useFakeTimers();

    const result = withTimeout(
      new Promise<string>(() => undefined),
      0,
      () => new Error("timed out"),
    );
    const rejection = expect(result).rejects.toThrow("timed out");

    await vi.advanceTimersByTimeAsync(0);

    await rejection;
  });

  it("rejects when the timeout error factory throws", async () => {
    vi.useFakeTimers();

    const result = withTimeout(new Promise<string>(() => undefined), 10, () => {
      throw new Error("factory failed");
    });
    const rejection = expect(result).rejects.toThrow("factory failed");

    await vi.advanceTimersByTimeAsync(10);

    await rejection;
  });
});

describe("withSolanaTimeout", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects with a Solana transaction timeout error", async () => {
    vi.useFakeTimers();

    const result = withSolanaTimeout(new Promise<string>(() => undefined), 10, "stale");
    const rejection = result.then(
      () => {
        throw new Error("Expected timeout to reject.");
      },
      (error: unknown) => {
        expect(error).toBeInstanceOf(SolanaError);
        expect(error).toMatchObject({
          code: "TRANSACTION_TIMEOUT",
          message: "stale",
        });
      },
    );

    await vi.advanceTimersByTimeAsync(10);

    await rejection;
  });
});
