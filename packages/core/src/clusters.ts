import type { SolanaCluster } from "./types";
import { createSolanaError } from "./errors";

export const DEFAULT_CLUSTER: SolanaCluster = "devnet";

const CLUSTER_ENDPOINTS: Record<SolanaCluster, string> = {
  mainnet: "https://api.mainnet.solana.com",
  "mainnet-beta": "https://api.mainnet.solana.com",
  testnet: "https://api.testnet.solana.com",
  devnet: "https://api.devnet.solana.com",
  localnet: "http://127.0.0.1:8899",
};

const CLUSTER_WEBSOCKET_ENDPOINTS: Record<SolanaCluster, string> = {
  mainnet: "wss://api.mainnet.solana.com",
  "mainnet-beta": "wss://api.mainnet.solana.com",
  testnet: "wss://api.testnet.solana.com",
  devnet: "wss://api.devnet.solana.com",
  localnet: "ws://127.0.0.1:8900",
};

export function getClusterEndpoint(cluster: SolanaCluster = DEFAULT_CLUSTER): string {
  return CLUSTER_ENDPOINTS[cluster];
}

export function getClusterWebSocketEndpoint(cluster: SolanaCluster = DEFAULT_CLUSTER): string {
  return CLUSTER_WEBSOCKET_ENDPOINTS[cluster];
}

export function getWebSocketEndpoint(endpoint: string): string {
  let url: URL;

  try {
    url = new URL(endpoint);
  } catch (cause) {
    throw createSolanaError("INVALID_INPUT", `Invalid Solana RPC endpoint: ${endpoint}`, {
      cause,
    });
  }

  if (url.protocol === "https:") {
    url.protocol = "wss:";
  } else if (url.protocol === "http:") {
    url.protocol = "ws:";
  }

  return url.toString();
}
