declare module "nuxt/schema" {
  import type { SolanaConfig } from "@vue-solana/core";

  interface PublicRuntimeConfig {
    solana?: SolanaConfig;
  }
}
