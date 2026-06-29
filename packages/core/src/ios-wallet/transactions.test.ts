import { describe, expect, it } from "vitest";
import { VersionedTransaction } from "@solana/web3-compat";
import {
  createVersionedTransaction,
  testTransactionSerialization,
} from "../transaction.test-utils";
import { deserializeTransaction, serializeTransaction } from "./transactions";

describe("iOS wallet transaction serialization", () => {
  testTransactionSerialization({ serializeTransaction, deserializeTransaction });

  it("deserializeTransaction returns a VersionedTransaction when no source is provided", () => {
    const transaction = createVersionedTransaction();
    const serializedTransaction = serializeTransaction(transaction);

    const deserializedTransaction = deserializeTransaction(undefined, serializedTransaction);

    expect(deserializedTransaction).toBeInstanceOf(VersionedTransaction);
  });
});
