declare module "nuxt/schema" {
  import type { ModuleOptions } from "../module";

  interface PublicRuntimeConfig {
    solana?: ModuleOptions;
  }
}
