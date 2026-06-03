import { addImports, addPlugin, createResolver, defineNuxtModule } from '@nuxt/kit'
import type { SolanaConfig } from '@vue-solana/core'
import './runtime/types'

export interface ModuleOptions extends SolanaConfig {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@vue-solana/nuxt',
    configKey: 'solana'
  },
  defaults: {
    cluster: 'devnet',
    autoConnect: false
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    nuxt.options.runtimeConfig.public.solana = {
      ...nuxt.options.runtimeConfig.public.solana,
      ...options
    }

    addPlugin(resolver.resolve('./runtime/plugin'))

    addImports([
      { name: 'useBalance', as: 'useSolanaBalance', from: '@vue-solana/vue' },
      { name: 'useConnection', as: 'useSolanaConnection', from: '@vue-solana/vue' },
      { name: 'useRpc', as: 'useSolanaRpc', from: '@vue-solana/vue' },
      { name: 'useSignAndSendTransaction', as: 'useSolanaSignAndSendTransaction', from: '@vue-solana/vue' },
      { name: 'useSolana', as: 'useSolana', from: '@vue-solana/vue' },
      { name: 'useWallet', as: 'useSolanaWallet', from: '@vue-solana/vue' }
    ])
  }
})
