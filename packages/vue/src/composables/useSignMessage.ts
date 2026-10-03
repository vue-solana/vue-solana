import { assertWalletCanSignMessage, createNoWalletSelectedError } from "@vue-solana/core/wallet";
import type { SolanaSignMessageResult } from "@vue-solana/core/types";
import { ref } from "vue";
import { useExecution } from "./use-execution";
import { useWallet } from "./useWallet";

export type SignMessageStatus = "idle" | "signing" | "signed" | "error";

export function useSignMessage() {
  const { wallet } = useWallet();
  const signedMessage = ref<Uint8Array | null>(null);
  const signature = ref<Uint8Array | null>(null);
  const { status, loading, error, execute } = useExecution<SignMessageStatus>("signing");

  function sign(message: Uint8Array): Promise<SolanaSignMessageResult> {
    signedMessage.value = null;
    signature.value = null;

    return execute(
      async () => {
        const activeWallet = wallet.value;

        if (!activeWallet) {
          throw createNoWalletSelectedError();
        }

        assertWalletCanSignMessage(activeWallet);

        return activeWallet.signMessage(message);
      },
      (result) => {
        signedMessage.value = result.signedMessage;
        signature.value = result.signature;

        return "signed";
      },
    );
  }

  return {
    signedMessage,
    signature,
    status,
    loading,
    error,
    execute: sign,
  };
}
