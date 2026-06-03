import type { SolanaConfig } from '@vue-solana/core'

declare module 'nuxt/schema' {
  interface PublicRuntimeConfig {
    solana: SolanaConfig
  }
}

export {}
