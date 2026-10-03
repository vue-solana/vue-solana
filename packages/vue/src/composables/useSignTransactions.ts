import type { SolanaTransaction } from "@vue-solana/core/types";
import {
  assertWalletCanSignTransactions,
  createNoWalletSelectedError,
} from "@vue-solana/core/wallet";
import { shallowRef } from "vue";
import { useExecution } from "./use-execution";
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
  const { status, loading, error, execute } = useExecution<SignTransactionsStatus>("signing");

  function sign(transactions: SolanaTransaction[]): Promise<SolanaTransaction[]> {
    signedTransactions.value = null;

    return execute(
      async () => {
        const activeWallet = wallet.value;

        if (!activeWallet) {
          throw createNoWalletSelectedError();
        }

        assertWalletCanSignTransactions(activeWallet);

        const sign = activeWallet.signTransactions
          ? activeWallet.signTransactions.bind(activeWallet)
          : activeWallet.signAllTransactions!.bind(activeWallet);

        return sign([...transactions]);
      },
      (result) => {
        signedTransactions.value = result;

        return "signed";
      },
    );
  }

  return {
    signedTransactions,
    status,
    loading,
    error,
    execute: sign,
  };
}
