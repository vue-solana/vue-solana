import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import type { SolanaError } from "@vue-solana/core/errors";
import type { Signature } from "@vue-solana/core/kit";
import type { ConfirmTransactionOptions } from "@vue-solana/core/types";
import { createMockSolanaContext, mountWithSolana } from "../../test-utils";
import { useTransactionConfirmation } from "./useTransactionConfirmation";

const SIGNATURE = "signature" as Signature;
const OLD_SIGNATURE = "old-signature" as Signature;
const NEW_SIGNATURE = "new-signature" as Signature;

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (cause: unknown) => void;
}

type TransactionConfirmationComposable = ReturnType<typeof useTransactionConfirmation>;

const CONFIRMED_STATUS = {
  slot: 1n,
  confirmations: null,
  err: null,
  confirmationStatus: "confirmed",
};

const PROCESSED_STATUS = {
  slot: 1n,
  confirmations: null,
  err: null,
  confirmationStatus: "processed",
};

const FINALIZED_STATUS = {
  slot: 1n,
  confirmations: null,
  err: null,
  confirmationStatus: "finalized",
};

describe("useTransactionConfirmation", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("tracks confirmation progress and result", async () => {
    const getSignatureStatuses = vi.fn(() => ({
      send: vi.fn().mockResolvedValue({ value: [CONFIRMED_STATUS] }),
    }));
    const result = mountTransactionConfirmation(getSignatureStatuses);

    const confirmation = result.confirm(SIGNATURE);

    expect(result.status.value).toBe("confirming");
    await expect(confirmation).resolves.toMatchObject({
      signature: "signature",
      commitment: "confirmed",
    });
    expect(result.status.value).toBe("confirmed");
    expect(result.signature.value).toBe("signature");
    expect(result.confirmation.value?.commitment).toBe("confirmed");
    expect(getSignatureStatuses).toHaveBeenCalledWith(["signature"]);
  });

  it("marks finalized when finalized commitment is requested", async () => {
    const getSignatureStatuses = vi.fn(() => ({
      send: vi.fn().mockResolvedValue({ value: [FINALIZED_STATUS] }),
    }));
    const result = mountTransactionConfirmation(getSignatureStatuses, { commitment: "finalized" });

    await result.confirm(SIGNATURE);

    expect(result.status.value).toBe("finalized");
    expect(getSignatureStatuses).toHaveBeenCalledWith(["signature"]);
  });

  it("marks processed when processed commitment is requested", async () => {
    const getSignatureStatuses = vi.fn(() => ({
      send: vi.fn().mockResolvedValue({ value: [PROCESSED_STATUS] }),
    }));
    const result = mountTransactionConfirmation(getSignatureStatuses, { commitment: "processed" });

    await result.confirm(SIGNATURE);

    expect(result.status.value).toBe("processed");
    expect(getSignatureStatuses).toHaveBeenCalledWith(["signature"]);
  });

  it("ignores an older confirmation that resolves after a newer confirmation", async () => {
    const firstConfirmation = createDeferred<{ value: (typeof CONFIRMED_STATUS)[] }>();
    const secondConfirmation = createDeferred<{ value: (typeof CONFIRMED_STATUS)[] }>();
    const getSignatureStatuses = vi
      .fn()
      .mockReturnValueOnce({ send: () => firstConfirmation.promise })
      .mockReturnValueOnce({ send: () => secondConfirmation.promise });
    const result = mountTransactionConfirmation(getSignatureStatuses);

    const first = result.confirm(OLD_SIGNATURE);
    const second = result.confirm(NEW_SIGNATURE, { commitment: "finalized" });

    secondConfirmation.resolve({ value: [FINALIZED_STATUS] });
    await expect(second).resolves.toMatchObject({ signature: "new-signature" });
    expect(result.signature.value).toBe("new-signature");
    expect(result.status.value).toBe("finalized");

    firstConfirmation.resolve({ value: [CONFIRMED_STATUS] });
    await expect(first).resolves.toMatchObject({ signature: "old-signature" });
    expect(result.signature.value).toBe("new-signature");
    expect(result.status.value).toBe("finalized");
    expect(result.confirmation.value?.signature).toBe("new-signature");
  });

  it("ignores an older confirmation that rejects after a newer confirmation", async () => {
    const firstConfirmation = createDeferred<{ value: (typeof CONFIRMED_STATUS)[] }>();
    const secondConfirmation = createDeferred<{ value: (typeof CONFIRMED_STATUS)[] }>();
    const staleFailure = new Error("stale confirmation failed");
    const getSignatureStatuses = vi
      .fn()
      .mockReturnValueOnce({ send: () => firstConfirmation.promise })
      .mockReturnValueOnce({ send: () => secondConfirmation.promise });
    const result = mountTransactionConfirmation(getSignatureStatuses);

    const first = result.confirm(OLD_SIGNATURE);
    const second = result.confirm(NEW_SIGNATURE);

    secondConfirmation.resolve({ value: [CONFIRMED_STATUS] });
    await expect(second).resolves.toMatchObject({ signature: "new-signature" });

    firstConfirmation.reject(staleFailure);
    await expect(first).rejects.toThrow("stale confirmation failed");
    expect(result.signature.value).toBe("new-signature");
    expect(result.status.value).toBe("confirmed");
    expect(result.error.value).toBeNull();
  });

  it("preserves the submitted signature when confirmation times out", async () => {
    vi.useFakeTimers();
    const getSignatureStatuses = vi.fn(() => ({
      send: vi.fn().mockResolvedValue({ value: [PROCESSED_STATUS] }),
    }));
    const result = mountTransactionConfirmation(getSignatureStatuses, { timeoutMs: 10 });

    const rejection = result.confirm(SIGNATURE).catch((cause: unknown) => cause);

    await vi.advanceTimersByTimeAsync(1500);
    await expect(rejection).resolves.toMatchObject({
      message: "Timed out waiting for transaction signature to reach confirmed commitment.",
    });
    expect(result.signature.value).toBe("signature");
    expect(result.status.value).toBe("error");
    expect(result.loading.value).toBe(false);
    expect((result.error.value as SolanaError | null)?.code).toBe("TRANSACTION_TIMEOUT");
  });

  it("normalizes confirmation failures", async () => {
    const failure = new Error("confirmation RPC failed");
    const getSignatureStatuses = vi.fn(() => ({ send: vi.fn().mockRejectedValue(failure) }));
    const result = mountTransactionConfirmation(getSignatureStatuses);

    await expect(result.confirm(SIGNATURE)).rejects.toThrow("confirmation RPC failed");
    expect(result.status.value).toBe("error");
    expect(result.error.value?.code).toBe("RPC_FAILURE");
    expect(result.error.value?.cause).toBe(failure);
  });
});

function mountTransactionConfirmation(
  getSignatureStatuses: unknown,
  options?: ConfirmTransactionOptions,
): TransactionConfirmationComposable {
  const context = createMockSolanaContext({
    client: { rpc: { getSignatureStatuses } } as ReturnType<
      typeof createMockSolanaContext
    >["client"],
  });
  let result: TransactionConfirmationComposable | undefined;

  mountWithSolana(
    defineComponent({
      setup() {
        result = useTransactionConfirmation(options);

        return () => h("div");
      },
    }),
    context,
  );

  if (!result) {
    throw new Error("useTransactionConfirmation test component did not mount.");
  }

  return result;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: Deferred<T>["resolve"];
  let reject!: Deferred<T>["reject"];
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}
