import { describe } from "vitest";
import { testTransactionSerialization } from "../transaction.test-utils";
import { deserializeTransaction, serializeTransaction } from "./transactions";

describe("wallet-standard transaction serialization", () => {
  testTransactionSerialization({ serializeTransaction, deserializeTransaction });
});
