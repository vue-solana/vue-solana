import { createSolanaContext, type SolanaConfig, type SolanaWallet } from '@vue-solana/core'
import { shallowRef, type App } from 'vue'
import { solanaInjectionKey, type VueSolanaContext } from './injection'

export interface VueSolanaPluginOptions extends SolanaConfig {
  wallet?: SolanaWallet | null
}

export function createSolanaPlugin(options: VueSolanaPluginOptions = {}) {
  return {
    install(app: App) {
      const context = createSolanaContext(options)
      const wallet = shallowRef<SolanaWallet | null>(options.wallet ?? null)

      const vueContext: VueSolanaContext = {
        ...context,
        wallet,
        setWallet(nextWallet) {
          wallet.value = nextWallet
        }
      }

      app.provide(solanaInjectionKey, vueContext)
    }
  }
}

export const VueSolana = createSolanaPlugin
