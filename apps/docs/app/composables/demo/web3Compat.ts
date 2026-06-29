import { Buffer } from "buffer/";

(globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer = Buffer;

export type Web3Compat = Pick<
  typeof import("@solana/web3-compat"),
  "PublicKey" | "Transaction" | "TransactionInstruction"
>;

let web3Promise: Promise<Web3Compat> | null = null;

export function loadWeb3Compat() {
  web3Promise ??= import("@solana/web3-compat").then((module) => ({
    PublicKey: module.PublicKey,
    Transaction: module.Transaction,
    TransactionInstruction: module.TransactionInstruction,
  }));

  return web3Promise;
}
