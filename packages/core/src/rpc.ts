import { Connection } from "@solana/web3-compat";
import {
  DEFAULT_CLUSTER,
  getClusterEndpoint,
  getClusterWebSocketEndpoint,
  getWebSocketEndpoint,
} from "./clusters";
import type { SolanaConfig, SolanaContext } from "./types";

export function createSolanaConnection(config: SolanaConfig = {}): Connection {
  const cluster = config.cluster ?? DEFAULT_CLUSTER;
  const endpoint = config.endpoint ?? getClusterEndpoint(cluster);
  const wsEndpoint =
    config.wsEndpoint ??
    (config.endpoint ? getWebSocketEndpoint(endpoint) : getClusterWebSocketEndpoint(cluster));

  return new Connection(endpoint, {
    commitment: config.commitment,
    wsEndpoint,
  });
}

export function createSolanaContext(config: SolanaConfig = {}): SolanaContext {
  const cluster = config.cluster ?? DEFAULT_CLUSTER;
  const endpoint = config.endpoint ?? getClusterEndpoint(cluster);
  const wsEndpoint =
    config.wsEndpoint ??
    (config.endpoint ? getWebSocketEndpoint(endpoint) : getClusterWebSocketEndpoint(cluster));

  return {
    cluster,
    endpoint,
    wsEndpoint,
    connection: createSolanaConnection(config),
  };
}
