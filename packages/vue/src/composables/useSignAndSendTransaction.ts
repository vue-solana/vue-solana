import {
  signAndSendTransaction,
  type SendTransactionOptions,
  type SolanaTransaction,
} from "@vue-solana/core";
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
