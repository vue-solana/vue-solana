import { createSolanaClient, type Commitment, type SolanaClient } from "@vue-solana/vue/kit";
import type { SolanaCluster } from "@vue-solana/vue";
import { useRuntimeConfig } from "#imports";

/**
 * Read-side Solana configuration for server/Nitro code. Intentionally excludes
 * wallet, payer, and signer fields so secrets never cross into a server utility.
 */
export interface SolanaServerConfig {
  cluster?: SolanaCluster;
  endpoint?: string;
  wsEndpoint?: string;
  commitment?: Commitment;
}

function stripForbiddenServerFields(config: unknown): SolanaServerConfig {
  if (typeof config !== "object" || config === null || Array.isArray(config)) {
    return {};
  }

  const sanitized = { ...(config as Record<string, unknown>) };

  delete sanitized.payer;
  delete sanitized.payerSecretKey;
  delete sanitized.wallet;

  return sanitized as SolanaServerConfig;
}

/**
 * Creates a server-side Solana Kit RPC client from explicit config.
 *
 * Accepts only read-side connection options. Wallet, payer, and signer fields
 * are omitted from the type and stripped at runtime so secrets cannot reach a
 * server utility by accident.
 */
export function createServerSolanaClient(config: SolanaServerConfig = {}): SolanaClient {
  const sanitized = stripForbiddenServerFields(config) as Record<string, unknown>;

  return createSolanaClient(sanitized as never);
}

/**
 * Nuxt server utility that reads the private `runtimeConfig.solanaServer` key.
 *
 * This config is never exposed to the browser. Use it in server routes or
 * server-only code and pass fetched data to pages via `useAsyncData`.
 */
export function useServerSolanaClient(): SolanaClient {
  const runtimeConfig = useRuntimeConfig() as { solanaServer?: SolanaServerConfig };

  return createServerSolanaClient(runtimeConfig.solanaServer ?? {});
}
