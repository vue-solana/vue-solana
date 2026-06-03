import { createSolanaPlugin } from '@vue-solana/vue'
import type { SolanaConfig } from '@vue-solana/core'
import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig().public.solana as SolanaConfig

  nuxtApp.vueApp.use(createSolanaPlugin({
    cluster: config.cluster,
    endpoint: config.endpoint,
    commitment: config.commitment,
    autoConnect: config.autoConnect
  }))
})
