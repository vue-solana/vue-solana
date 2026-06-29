import { Transaction, VersionedTransaction } from "@solana/web3-compat";
import type { SolanaTransaction } from "../types";

export function serializeTransaction(transaction: SolanaTransaction): Uint8Array {
  if (transaction instanceof Transaction) {
    return transaction.serialize({ requireAllSignatures: false, verifySignatures: false });
  }

  return transaction.serialize();
}

export function deserializeTransaction(
  source: SolanaTransaction,
  bytes: Uint8Array,
): SolanaTransaction {
  if (source instanceof Transaction) {
    return Transaction.from(bytes);
  }

  return VersionedTransaction.deserialize(bytes);
}
