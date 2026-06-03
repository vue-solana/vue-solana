import type { SolanaContext, SolanaWallet } from '@vue-solana/core'
import type { InjectionKey, Ref } from 'vue'

export interface VueSolanaContext extends SolanaContext {
  wallet: Ref<SolanaWallet | null>
  setWallet: (wallet: SolanaWallet | null) => void
}

export const solanaInjectionKey: InjectionKey<VueSolanaContext> = Symbol('VueSolana')
