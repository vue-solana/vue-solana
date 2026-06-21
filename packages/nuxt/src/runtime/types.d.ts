declare module "nuxt/schema" {
  import type { VueSolanaPluginOptions } from "@vue-solana/vue";

  interface PublicRuntimeConfig {
    solana?: VueSolanaPluginOptions;
  }
}
