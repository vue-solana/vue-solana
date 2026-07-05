import { installSolanaBufferPolyfill } from "@vue-solana/nuxt/buffer-polyfill";

installSolanaBufferPolyfill();

export type Web3Compat = Pick<
  typeof import("@vue-solana/nuxt/web3"),
  "PublicKey" | "Transaction" | "TransactionInstruction"
>;

let web3Promise: Promise<Web3Compat> | null = null;

export function loadWeb3Compat() {
  web3Promise ??= import("@vue-solana/nuxt/web3").then((module) => ({
    PublicKey: module.PublicKey,
    Transaction: module.Transaction,
    TransactionInstruction: module.TransactionInstruction,
  }));

  return web3Promise;
}
