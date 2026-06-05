import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, shallowRef } from "vue";
import type { SolanaTransaction, SolanaWallet } from "@vue-solana/core";
import { createMockSolanaContext, mountWithSolana } from "../../test-utils";
import { useSignAndSendTransaction } from "./useSignAndSendTransaction";

const publicKey = { toBase58: () => "public-key" } as SolanaWallet["publicKey"];

describe("useSignAndSendTransaction", () => {
  it("sends transactions through the current wallet", async () => {
    const wallet = {
      publicKey,
      connected: true,
      connect: vi.fn(),
      disconnect: vi.fn(),
      signAndSendTransaction: vi.fn().mockResolvedValue({ signature: "signature" }),
    } as unknown as SolanaWallet;
    const context = createMockSolanaContext({ wallet: shallowRef(wallet) });
    const transaction = {} as SolanaTransaction;
    let result: ReturnType<typeof useSignAndSendTransaction> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useSignAndSendTransaction();

          return () => h("div");
        },
      }),
      context,
    );

    await expect(result?.execute(transaction)).resolves.toBe("signature");
    expect(wallet.signAndSendTransaction).toHaveBeenCalledWith(transaction, undefined);
    expect(result?.signature.value).toBe("signature");
  });

  it("rejects when no wallet is configured", async () => {
    let result: ReturnType<typeof useSignAndSendTransaction> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useSignAndSendTransaction();

          return () => h("div");
        },
      }),
    );

    await expect(result?.execute({} as SolanaTransaction)).rejects.toThrow(
      "No Solana wallet is configured",
    );
  });
});
