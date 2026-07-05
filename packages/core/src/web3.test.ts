import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
} from "@solana/web3-compat";
import { describe, expect, it } from "vitest";
import * as web3 from "./web3";

import type {
  AccountInfo,
  Commitment,
  RpcResponseAndContext,
  SendOptions,
  SignatureResult,
  SignatureStatus,
  TransactionSignature,
} from "./web3";

describe("web3 compatibility re-exports", () => {
  it("re-exports the Solana primitives documented for app usage", () => {
    expect(web3.Connection).toBe(Connection);
    expect(web3.Keypair).toBe(Keypair);
    expect(web3.PublicKey).toBe(PublicKey);
    expect(web3.SystemProgram).toBe(SystemProgram);
    expect(web3.Transaction).toBe(Transaction);
    expect(web3.TransactionInstruction).toBe(TransactionInstruction);
    expect(web3.VersionedTransaction).toBe(VersionedTransaction);
  });

  it("re-exports public web3 compatibility types", () => {
    const accountInfo = null as AccountInfo<Buffer> | null;
    const commitment = "confirmed" satisfies Commitment;
    const response = {
      context: { slot: 1 },
      value: accountInfo,
    } satisfies RpcResponseAndContext<AccountInfo<Buffer> | null>;
    const sendOptions = { skipPreflight: true } satisfies SendOptions;
    const signature = "" as TransactionSignature;
    const signatureResult = { err: null } satisfies SignatureResult;
    const signatureStatus = {
      slot: 1,
      confirmations: null,
      err: null,
      confirmationStatus: "confirmed",
    } satisfies SignatureStatus;

    expect(response.value).toBeNull();
    expect(commitment).toBe("confirmed");
    expect(sendOptions.skipPreflight).toBe(true);
    expect(signature).toBe("");
    expect(signatureResult.err).toBeNull();
    expect(signatureStatus.confirmationStatus).toBe("confirmed");
  });
});
