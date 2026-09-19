import type { SolanaTransaction } from "@vue-solana/core/types";
import { normalizeSolanaError, type SolanaError } from "@vue-solana/core/errors";
import {
  assertWalletCanSignTransactions,
  createNoWalletSelectedError,
} from "@vue-solana/core/wallet";
import { ref, shallowRef } from "vue";
import { useWallet } from "./useWallet";

export type SignTransactionsStatus = "idle" | "signing" | "signed" | "error";

/**
 * Sign multiple serialized transactions in a single wallet request.
 *
 * Prefers the wallet's batch `signTransactions` capability and falls back to
 * `signAllTransactions` (the legacy naming) when only that is present.
 * Partial rejection is not a thing in the Wallet Standard: either every
 * transaction is signed or the request rejects, so a failure clears the
 * previous result.
 */
export function useSignTransactions() {
  const { wallet } = useWallet();
  const signedTransactions = shallowRef<SolanaTransaction[] | null>(null);
  const status = ref<SignTransactionsStatus>("idle");
  const loading = ref(false);
  const error = ref<SolanaError | null>(null);
  let executionId = 0;

  async function execute(transactions: SolanaTransaction[]): Promise<SolanaTransaction[]> {
    const currentExecutionId = ++executionId;

    status.value = "signing";
    loading.value = true;
    error.value = null;
    signedTransactions.value = null;

    const activeWallet = wallet.value;

    if (!activeWallet) {
      const normalizedError = createNoWalletSelectedError();
      error.value = normalizedError;
      status.value = "error";
      loading.value = false;

      throw normalizedError;
    }

    try {
      assertWalletCanSignTransactions(activeWallet);

      const sign = activeWallet.signTransactions
        ? activeWallet.signTransactions.bind(activeWallet)
        : activeWallet.signAllTransactions!.bind(activeWallet);
      const result = await sign([...transactions]);

      if (currentExecutionId === executionId) {
        signedTransactions.value = result;
        status.value = "signed";
      }

      return result;
    } catch (cause) {
      const normalizedError = normalizeSolanaError(cause, "RPC_FAILURE");

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
    signedTransactions,
    status,
    loading,
    error,
    execute,
  };
}
