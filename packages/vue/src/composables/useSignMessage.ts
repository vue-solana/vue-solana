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
  const error = ref<Error | null>(null);
  let executionId = 0;

  async function execute(message: Uint8Array): Promise<SolanaSignMessageResult> {
    const currentExecutionId = ++executionId;

    status.value = "signing";
    loading.value = true;
    error.value = null;
    signedMessage.value = null;
    signature.value = null;

    const activeWallet = wallet.value;

    if (!activeWallet) {
      const cause = new Error("No Solana wallet is configured");
      error.value = cause;
      status.value = "error";
      loading.value = false;

      throw cause;
    }

    try {
      assertWalletCanSignMessage(activeWallet);

      const result = await activeWallet.signMessage(message);

      if (currentExecutionId === executionId) {
        signedMessage.value = result.signedMessage;
        signature.value = result.signature;
        status.value = "signed";
      }

      return result;
    } catch (cause) {
      const normalizedError = normalizeError(cause);

      if (currentExecutionId === executionId) {
        error.value = normalizedError;
        status.value = "error";
      }

      throw normalizedError;
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

function normalizeError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error(String(cause));
}
