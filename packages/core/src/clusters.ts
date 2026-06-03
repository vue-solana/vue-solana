import type { SolanaCluster } from './types'

export const DEFAULT_CLUSTER: SolanaCluster = 'devnet'

const CLUSTER_ENDPOINTS: Record<SolanaCluster, string> = {
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  testnet: 'https://api.testnet.solana.com',
  devnet: 'https://api.devnet.solana.com',
  localnet: 'http://127.0.0.1:8899'
}

const CLUSTER_WEBSOCKET_ENDPOINTS: Record<SolanaCluster, string> = {
  'mainnet-beta': 'wss://api.mainnet-beta.solana.com',
  testnet: 'wss://api.testnet.solana.com',
  devnet: 'wss://api.devnet.solana.com',
  localnet: 'ws://127.0.0.1:8900'
}

export function getClusterEndpoint(cluster: SolanaCluster = DEFAULT_CLUSTER): string {
  return CLUSTER_ENDPOINTS[cluster]
}

export function getClusterWebSocketEndpoint(cluster: SolanaCluster = DEFAULT_CLUSTER): string {
  return CLUSTER_WEBSOCKET_ENDPOINTS[cluster]
}

export function getWebSocketEndpoint(endpoint: string): string {
  const url = new URL(endpoint)

  if (url.protocol === 'https:') {
    url.protocol = 'wss:'
  } else if (url.protocol === 'http:') {
    url.protocol = 'ws:'
  }

  return url.toString()
}
