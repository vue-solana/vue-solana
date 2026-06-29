import { PublicKey, SystemProgram, Transaction, VersionedTransaction } from "@solana/web3-compat";
import { expect, it } from "vitest";
import type { SolanaTransaction } from "./types";

type TransactionSerializationTestOptions = {
  serializeTransaction: (transaction: SolanaTransaction) => Uint8Array;
  deserializeTransaction: (source: SolanaTransaction, bytes: Uint8Array) => SolanaTransaction;
};

const blockhash = "11111111111111111111111111111111";
const publicKey = new PublicKey("11111111111111111111111111111111");
const versionedTransactionBytes = new Uint8Array([
  1,
  ...Array(64).fill(0),
  128,
  1,
  0,
  0,
  1,
  ...Array(32).fill(0),
  ...Array(32).fill(0),
  0,
  0,
]);

export function createLegacyTransaction() {
  return new Transaction({ feePayer: publicKey, recentBlockhash: blockhash }).add(
    SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: publicKey,
      lamports: 0,
    }),
  );
}

export function createVersionedTransaction() {
  return VersionedTransaction.deserialize(versionedTransactionBytes);
}

export function testTransactionSerialization({
  serializeTransaction,
  deserializeTransaction,
}: TransactionSerializationTestOptions) {
  it("serializeTransaction serializes legacy Transaction with partial-signature options", () => {
    const transaction = createLegacyTransaction();

    expect(() => transaction.serialize()).toThrow();
    expect(serializeTransaction(transaction)).toBeInstanceOf(Uint8Array);
  });

  it("deserializeTransaction returns a legacy Transaction when the source is legacy", () => {
    const transaction = createLegacyTransaction();
    const serializedTransaction = serializeTransaction(transaction);

    const deserializedTransaction = deserializeTransaction(transaction, serializedTransaction);

    expect(deserializedTransaction).toBeInstanceOf(Transaction);
  });

  it("serializeTransaction supports VersionedTransaction", () => {
    const transaction = createVersionedTransaction();

    expect(serializeTransaction(transaction)).toBeInstanceOf(Uint8Array);
  });

  it("deserializeTransaction returns a VersionedTransaction when the source is versioned", () => {
    const transaction = createVersionedTransaction();
    const serializedTransaction = serializeTransaction(transaction);

    const deserializedTransaction = deserializeTransaction(transaction, serializedTransaction);

    expect(deserializedTransaction).toBeInstanceOf(VersionedTransaction);
  });
}
