import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, shallowRef } from "vue";
import type { SolanaWallet } from "@vue-solana/core/types";
import { createMockSolanaContext, mountWithSolana } from "../../test-utils";
import { useSignTransactions } from "./useSignTransactions";
import { useSignAndSendTransactions } from "./useSignAndSendTransactions";

const publicKey = "public-key" as SolanaWallet["publicKey"];
const transactions = [new Uint8Array([1]), new Uint8Array([2])];

function connectedWallet(overrides: Partial<SolanaWallet> = {}): SolanaWallet {
  return {
    publicKey,
    connected: true,
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
    ...overrides,
  } as SolanaWallet;
}

function mountWithWallet<T>(useComposable: () => T, wallet: SolanaWallet | null): T {
  let result: T | undefined;

  mountWithSolana(
    defineComponent({
      setup() {
        result = useComposable();

        return () => h("div");
      },
    }),
    createMockSolanaContext({ wallet: shallowRef(wallet) }),
  );

  if (!result) {
    throw new Error("composable did not mount.");
  }

  return result;
}

describe("useSignTransactions", () => {
  it("signs all transactions in one wallet request", async () => {
    const signed = [new Uint8Array([9]), new Uint8Array([8])];
    const signTransactions = vi.fn(async () => signed);
    const result = mountWithWallet(useSignTransactions, connectedWallet({ signTransactions }));

    const promise = result.execute(transactions);

    expect(result.status.value).toBe("signing");
    expect(result.loading.value).toBe(true);

    const resolved = await promise;

    expect(signTransactions).toHaveBeenCalledWith(transactions);
    expect(resolved).toBe(signed);
    expect(result.signedTransactions.value).toBe(signed);
    expect(result.status.value).toBe("signed");
    expect(result.loading.value).toBe(false);
  });

  it("falls back to signAllTransactions when the batch capability is absent", async () => {
    const signed = [new Uint8Array([9])];
    const signAllTransactions = vi.fn(async () => signed);
    const result = mountWithWallet(useSignTransactions, connectedWallet({ signAllTransactions }));

    await result.execute([transactions[0]!]);

    expect(signAllTransactions).toHaveBeenCalledWith([transactions[0]]);
    expect(result.signedTransactions.value).toBe(signed);
  });

  it("rejects with NO_WALLET_SELECTED when no wallet is selected", async () => {
    const result = mountWithWallet(useSignTransactions, null);

    await expect(result.execute(transactions)).rejects.toMatchObject({
      code: "NO_WALLET_SELECTED",
    });
    expect(result.status.value).toBe("error");
  });

  it("rejects with WALLET_FEATURE_UNSUPPORTED when the wallet cannot sign", async () => {
    const result = mountWithWallet(useSignTransactions, connectedWallet());

    await expect(result.execute(transactions)).rejects.toMatchObject({
      code: "WALLET_FEATURE_UNSUPPORTED",
    });
    expect(result.status.value).toBe("error");
  });

  it("captures wallet rejection into error state and rethrows", async () => {
    const rejection = new Error("user declined");
    const signTransactions = vi.fn(async () => {
      throw rejection;
    });
    const result = mountWithWallet(useSignTransactions, connectedWallet({ signTransactions }));

    await expect(result.execute(transactions)).rejects.toBeInstanceOf(Error);
    expect(result.status.value).toBe("error");
    expect(result.error.value?.cause).toBe(rejection);
    expect(result.signedTransactions.value).toBeNull();
  });
});

describe("useSignAndSendTransactions", () => {
  it("signs and sends all transactions in one wallet request", async () => {
    const signatures = ["sig-a", "sig-b"];
    const signAndSendTransactions = vi.fn(async () => signatures);
    const result = mountWithWallet(
      useSignAndSendTransactions,
      connectedWallet({ signAndSendTransactions }),
    );

    const promise = result.execute(transactions, { skipPreflight: true });

    expect(result.status.value).toBe("sending");

    const resolved = await promise;

    expect(signAndSendTransactions).toHaveBeenCalledWith(transactions, { skipPreflight: true });
    expect(resolved).toBe(signatures);
    expect(result.signatures.value).toBe(signatures);
    expect(result.status.value).toBe("sent");
    expect(result.loading.value).toBe(false);
  });

  it("falls back to looping signAndSendTransaction when the batch capability is absent", async () => {
    const signAndSendTransaction = vi
      .fn()
      .mockResolvedValueOnce({ signature: "sig-1" })
      .mockResolvedValueOnce({ signature: "sig-2" });
    const result = mountWithWallet(
      useSignAndSendTransactions,
      connectedWallet({ signAndSendTransaction }),
    );

    const resolved = await result.execute(transactions);

    expect(signAndSendTransaction).toHaveBeenCalledTimes(2);
    expect(resolved).toEqual(["sig-1", "sig-2"]);
  });

  it("rejects with NO_WALLET_SELECTED when no wallet is selected", async () => {
    const result = mountWithWallet(useSignAndSendTransactions, null);

    await expect(result.execute(transactions)).rejects.toMatchObject({
      code: "NO_WALLET_SELECTED",
    });
    expect(result.status.value).toBe("error");
  });

  it("rejects with WALLET_FEATURE_UNSUPPORTED when the wallet cannot send", async () => {
    const result = mountWithWallet(useSignAndSendTransactions, connectedWallet());

    await expect(result.execute(transactions)).rejects.toMatchObject({
      code: "WALLET_FEATURE_UNSUPPORTED",
    });
    expect(result.status.value).toBe("error");
  });

  it("captures wallet rejection into error state and rethrows", async () => {
    const rejection = new Error("insufficient funds");
    const signAndSendTransactions = vi.fn(async () => {
      throw rejection;
    });
    const result = mountWithWallet(
      useSignAndSendTransactions,
      connectedWallet({ signAndSendTransactions }),
    );

    await expect(result.execute(transactions)).rejects.toBeInstanceOf(Error);
    expect(result.status.value).toBe("error");
    expect(result.error.value?.cause).toBe(rejection);
    expect(result.signatures.value).toBeNull();
  });
});
