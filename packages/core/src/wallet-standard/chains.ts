import type { SolanaChain, SolanaCluster } from "../types";

export const SOLANA_CHAINS: readonly SolanaChain[] = [
  "solana:mainnet",
  "solana:testnet",
  "solana:devnet",
  "solana:localnet",
];

export function getSolanaChain(cluster: SolanaCluster): SolanaChain {
  if (cluster === "mainnet-beta") {
    return "solana:mainnet";
  }

  return `solana:${cluster}`;
}
