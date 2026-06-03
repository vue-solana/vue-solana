import { clusterApiUrl } from '@solana/web3-compat'
import type { SolanaCluster } from './types'

export const DEFAULT_CLUSTER: SolanaCluster = 'devnet'

export function getClusterEndpoint(cluster: SolanaCluster = DEFAULT_CLUSTER): string {
  if (cluster === 'localnet') {
    return 'http://127.0.0.1:8899'
  }

  return clusterApiUrl(cluster)
}
