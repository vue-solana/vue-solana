import { assertWalletCanSignMessage } from "@vue-solana/core/wallet";
import type { SolanaSignMessageResult } from "@vue-solana/core/types";
import { ref } from "vue";
import { useWallet } from "./useWallet";

export type SignMessageStatus = "idle" | "signing" | "signed" | "error";

export function useSignMessage() {
  const { wallet } = useWallet();
  const signedMessage = ref<Uint8Array | null>(null);
  const signature = ref<Uint8Array | null>(null);
  const status = ref<SignMessageStatus>("idle");
  const loading = ref(false);
  const error = ref<unknown>(null);
  let executionId = 0;

  async function execute(message: Uint8Array): Promise<SolanaSignMessageResult> {
    const currentExecutionId = ++executionId;

    status.value = "signing";
    loading.value = true;
    error.value = null;
    signedMessage.value = null;
    signature.value = null;

    try {
      if (!wallet.value) {
        throw new Error("No Solana wallet is configured");
      }

      assertWalletCanSignMessage(wallet.value);

      const result = await wallet.value.signMessage(message);

      if (currentExecutionId === executionId) {
        signedMessage.value = result.signedMessage;
        signature.value = result.signature;
        status.value = "signed";
      }

      return result;
    } catch (cause) {
      if (currentExecutionId === executionId) {
        error.value = cause;
        status.value = "error";
      }

      throw cause;
    } finally {
      if (currentExecutionId === executionId) {
        loading.value = false;
      }
    }
  }

  return {
    signedMessage,
    signature,
    status,
    loading,
    error,
    execute,
  };
}
