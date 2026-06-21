import { createSolanaPlugin } from "@vue-solana/vue";
import type { VueSolanaPluginOptions } from "@vue-solana/vue";
import { defineNuxtPlugin, useRuntimeConfig } from "#app";

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig().public.solana as VueSolanaPluginOptions;

  nuxtApp.vueApp.use(
    createSolanaPlugin({
      cluster: config.cluster,
      endpoint: config.endpoint,
      wsEndpoint: config.wsEndpoint,
      commitment: config.commitment,
      autoConnect: config.autoConnect,
      mobileWallet: config.mobileWallet,
      iosWallet: config.iosWallet,
    }),
  );
});
