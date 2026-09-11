import { createClient } from "@solana/kit";
import { solanaRpcConnection } from "@solana/kit-plugin-rpc";
import {
  DEFAULT_CLUSTER,
  getClusterEndpoint,
  getClusterWebSocketEndpoint,
  getWebSocketEndpoint,
} from "./clusters";
import type { SolanaConfig } from "./types";

/**
 * Create a @solana/kit client for the given Solana configuration.
 *
 * The returned client exposes read-only `rpc` and `rpcSubscriptions`; use
 * `client.rpc.getSlot().send()` and friends instead of the legacy
 * `connection` APIs.
 */
export function createSolanaClient(config: SolanaConfig = {}) {
  const cluster = config.cluster ?? DEFAULT_CLUSTER;
  const endpoint = config.endpoint ?? getClusterEndpoint(cluster);
  const wsEndpoint =
    config.wsEndpoint ??
    (config.endpoint ? getWebSocketEndpoint(endpoint) : getClusterWebSocketEndpoint(cluster));

  return createClient().use(
    solanaRpcConnection({
      rpcUrl: endpoint,
      rpcSubscriptionsUrl: wsEndpoint,
    }),
  );
}

export type SolanaClient = ReturnType<typeof createSolanaClient>;

export type { Address, Rpc, SolanaRpcApi } from "@solana/kit";
export { address, lamports } from "@solana/kit";
