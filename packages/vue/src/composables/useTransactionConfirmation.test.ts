import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import type { Connection } from "@solana/web3-compat";
import { createMockSolanaContext, mountWithSolana } from "../../test-utils";
import { useTransactionConfirmation } from "./useTransactionConfirmation";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (cause: unknown) => void;
}

describe("useTransactionConfirmation", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("tracks confirmation progress and result", async () => {
    const confirmationResult = { value: { err: null } };
    const connection = {
      confirmTransaction: vi.fn().mockResolvedValue(confirmationResult),
    } as unknown as Connection;
    const context = createMockSolanaContext({ connection });
    let result: ReturnType<typeof useTransactionConfirmation> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useTransactionConfirmation();

          return () => h("div");
        },
      }),
      context,
    );

    const confirmation = result?.confirm("signature");

    expect(result?.status.value).toBe("confirming");
    await expect(confirmation).resolves.toEqual({
      signature: "signature",
      commitment: "confirmed",
      result: confirmationResult,
    });
    expect(result?.status.value).toBe("confirmed");
    expect(result?.signature.value).toBe("signature");
    expect(result?.confirmation.value?.result).toEqual(confirmationResult);
    expect(connection.confirmTransaction).toHaveBeenCalledWith("signature", "confirmed");
  });

  it("marks finalized when finalized commitment is requested", async () => {
    const connection = {
      confirmTransaction: vi.fn().mockResolvedValue({ value: { err: null } }),
    } as unknown as Connection;
    const context = createMockSolanaContext({ connection });
    let result: ReturnType<typeof useTransactionConfirmation> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useTransactionConfirmation({ commitment: "finalized" });

          return () => h("div");
        },
      }),
      context,
    );

    await result?.confirm("signature");

    expect(result?.status.value).toBe("finalized");
    expect(connection.confirmTransaction).toHaveBeenCalledWith("signature", "finalized");
  });

  it("marks processed when processed commitment is requested", async () => {
    const connection = {
      confirmTransaction: vi.fn().mockResolvedValue({ value: { err: null } }),
    } as unknown as Connection;
    const context = createMockSolanaContext({ connection });
    let result: ReturnType<typeof useTransactionConfirmation> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useTransactionConfirmation({ commitment: "processed" });

          return () => h("div");
        },
      }),
      context,
    );

    await result?.confirm("signature");

    expect(result?.status.value).toBe("processed");
    expect(connection.confirmTransaction).toHaveBeenCalledWith("signature", "processed");
  });

  it("ignores an older confirmation that resolves after a newer confirmation", async () => {
    const firstConfirmation = createDeferred<{ value: { err: null } }>();
    const secondConfirmation = createDeferred<{ value: { err: null } }>();
    const connection = {
      confirmTransaction: vi
        .fn()
        .mockReturnValueOnce(firstConfirmation.promise)
        .mockReturnValueOnce(secondConfirmation.promise),
    } as unknown as Connection;
    const context = createMockSolanaContext({ connection });
    let result: ReturnType<typeof useTransactionConfirmation> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useTransactionConfirmation();

          return () => h("div");
        },
      }),
      context,
    );

    const first = result?.confirm("old-signature");
    const second = result?.confirm("new-signature", { commitment: "finalized" });

    secondConfirmation.resolve({ value: { err: null } });
    await expect(second).resolves.toMatchObject({ signature: "new-signature" });
    expect(result?.signature.value).toBe("new-signature");
    expect(result?.status.value).toBe("finalized");

    firstConfirmation.resolve({ value: { err: null } });
    await expect(first).resolves.toMatchObject({ signature: "old-signature" });
    expect(result?.signature.value).toBe("new-signature");
    expect(result?.status.value).toBe("finalized");
    expect(result?.confirmation.value?.signature).toBe("new-signature");
  });

  it("ignores an older confirmation that rejects after a newer confirmation", async () => {
    const firstConfirmation = createDeferred<{ value: { err: null } }>();
    const secondConfirmation = createDeferred<{ value: { err: null } }>();
    const staleFailure = new Error("stale confirmation failed");
    const connection = {
      confirmTransaction: vi
        .fn()
        .mockReturnValueOnce(firstConfirmation.promise)
        .mockReturnValueOnce(secondConfirmation.promise),
    } as unknown as Connection;
    const context = createMockSolanaContext({ connection });
    let result: ReturnType<typeof useTransactionConfirmation> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useTransactionConfirmation();

          return () => h("div");
        },
      }),
      context,
    );

    const first = result?.confirm("old-signature");
    const second = result?.confirm("new-signature");

    secondConfirmation.resolve({ value: { err: null } });
    await expect(second).resolves.toMatchObject({ signature: "new-signature" });

    firstConfirmation.reject(staleFailure);
    await expect(first).rejects.toThrow("stale confirmation failed");
    expect(result?.signature.value).toBe("new-signature");
    expect(result?.status.value).toBe("confirmed");
    expect(result?.error.value).toBeNull();
  });

  it("preserves the submitted signature when confirmation times out", async () => {
    vi.useFakeTimers();
    const connection = {
      confirmTransaction: vi.fn(() => new Promise(() => undefined)),
    } as unknown as Connection;
    const context = createMockSolanaContext({ connection });
    let result: ReturnType<typeof useTransactionConfirmation> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useTransactionConfirmation({ timeoutMs: 10 });

          return () => h("div");
        },
      }),
      context,
    );

    const confirmation = result?.confirm("signature");
    const rejection = expect(confirmation).rejects.toThrow(
      "Timed out waiting for transaction signature to reach confirmed commitment.",
    );

    await vi.advanceTimersByTimeAsync(10);
    await rejection;
    expect(result?.signature.value).toBe("signature");
    expect(result?.status.value).toBe("error");
    expect(result?.loading.value).toBe(false);
  });
});

function createDeferred<T>(): Deferred<T> {
  let resolve!: Deferred<T>["resolve"];
  let reject!: Deferred<T>["reject"];
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}
