import { signAndSendTransaction } from "@vue-solana/core/transaction";
import type { SendTransactionOptions, SolanaTransaction } from "@vue-solana/core/types";
import { useConnection } from "./useConnection";
import { useWallet } from "./useWallet";
import { useTransaction } from "./useTransaction";

export function useSignAndSendTransaction() {
  const connection = useConnection();
  const { wallet } = useWallet();

  return useTransaction((transaction: SolanaTransaction, options?: SendTransactionOptions) => {
    if (!wallet.value) {
      return Promise.reject(new Error("No Solana wallet is configured"));
    }

    return signAndSendTransaction(connection, wallet.value, transaction, options);
  });
}
