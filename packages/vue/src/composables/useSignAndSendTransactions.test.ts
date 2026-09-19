import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, shallowRef } from "vue";
import type { Signature } from "@vue-solana/core/kit";
import type { SolanaTransaction, SolanaWallet } from "@vue-solana/core";
import { createMockSolanaContext, mountWithSolana } from "../../test-utils";
import { PartialSignAndSendError, useSignAndSendTransactions } from "./useSignAndSendTransactions";

const publicKey = "public-key" as SolanaWallet["publicKey"];

type Result = ReturnType<typeof useSignAndSendTransactions>;

describe("useSignAndSendTransactions", () => {
  it("uses the batch capability when the wallet supports it", async () => {
    const signAndSendTransactions = vi.fn().mockResolvedValue(["sig-1", "sig-2"]);
    const wallet = createWallet({ signAndSendTransactions });
    const result = mount(createMockSolanaContext({ wallet: shallowRef(wallet) }));

    await expect(
      result.execute([{} as SolanaTransaction, {} as SolanaTransaction]),
    ).resolves.toEqual(["sig-1", "sig-2"]);
    expect(signAndSendTransactions).toHaveBeenCalledOnce();
    expect(result.status.value).toBe("sent");
  });

  it("falls back to the singular request in sequence when the batch capability is missing", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ signature: "sig-1" })
      .mockResolvedValueOnce({ signature: "sig-2" });
    const wallet = createWallet({ signAndSendTransaction: send });
    const result = mount(createMockSolanaContext({ wallet: shallowRef(wallet) }));

    await expect(
      result.execute([{} as SolanaTransaction, {} as SolanaTransaction]),
    ).resolves.toEqual(["sig-1", "sig-2"]);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("stops the singular fallback at the first failure and reports signatures already sent", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ signature: "sig-1" })
      .mockRejectedValueOnce(new Error("second failed"));
    const wallet = createWallet({ signAndSendTransaction: send });
    const result = mount(createMockSolanaContext({ wallet: shallowRef(wallet) }));

    let caught: unknown;
    await result
      .execute([{} as SolanaTransaction, {} as SolanaTransaction, {} as SolanaTransaction])
      .catch((error: unknown) => {
        caught = error;
      });

    expect(caught).toBeInstanceOf(PartialSignAndSendError);
    expect((caught as PartialSignAndSendError).signatures).toEqual(["sig-1"]);
    // The third transaction is never attempted: no stranded in-flight siblings.
    expect(send).toHaveBeenCalledTimes(2);
    expect(result.status.value).toBe("error");
    expect(result.signatures.value).toBeNull();
  });

  it("rejects when no wallet is configured", async () => {
    const result = mount();

    await expect(result.execute([{} as SolanaTransaction])).rejects.toThrow(
      "No Solana wallet is selected",
    );
    expect(result.error.value?.code).toBe("NO_WALLET_SELECTED");
  });
});

function createWallet(overrides: Partial<SolanaWallet> = {}): SolanaWallet {
  return {
    publicKey,
    connected: true,
    connect: vi.fn(),
    disconnect: vi.fn(),
    signAndSendTransaction: vi.fn().mockResolvedValue({ signature: "signature" as Signature }),
    ...overrides,
  } as unknown as SolanaWallet;
}

function mount(context = createMockSolanaContext()): Result {
  let result: Result | undefined;

  mountWithSolana(
    defineComponent({
      setup() {
        result = useSignAndSendTransactions();

        return () => h("div");
      },
    }),
    context,
  );

  if (!result) {
    throw new Error("useSignAndSendTransactions did not mount.");
  }

  return result;
}
