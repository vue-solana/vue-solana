import { signAndSendTransaction } from "@vue-solana/core/transaction";
import type { SendTransactionOptions, SolanaTransaction } from "@vue-solana/core/types";
import { useConnection } from "./useConnection";
import { useWallet } from "./useWallet";
import { useTransaction } from "./useTransaction";

const SIGN_AND_SEND_TIMEOUT_MS = 120_000;

export function useSignAndSendTransaction() {
  const connection = useConnection();
  const { wallet } = useWallet();

  return useTransaction(
    (transaction: SolanaTransaction, options?: SendTransactionOptions) => {
      if (!wallet.value) {
        return Promise.reject(new Error("No Solana wallet is configured"));
      }

      return signAndSendTransaction(connection, wallet.value, transaction, options);
    },
    {
      timeoutMs: SIGN_AND_SEND_TIMEOUT_MS,
      timeoutMessage:
        "Wallet transaction did not return a result. Check your wallet or explorer for the final status.",
    },
  );
}
