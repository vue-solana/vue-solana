import { Connection } from '@solana/web3-compat'
import { DEFAULT_CLUSTER, getClusterEndpoint } from './clusters'
import type { SolanaConfig, SolanaContext } from './types'

export function createSolanaConnection(config: SolanaConfig = {}): Connection {
  const endpoint = config.endpoint ?? getClusterEndpoint(config.cluster ?? DEFAULT_CLUSTER)

  return new Connection(endpoint, config.commitment)
}

export function createSolanaContext(config: SolanaConfig = {}): SolanaContext {
  const cluster = config.cluster ?? DEFAULT_CLUSTER
  const endpoint = config.endpoint ?? getClusterEndpoint(cluster)

  return {
    cluster,
    endpoint,
    connection: new Connection(endpoint, config.commitment)
  }
}
