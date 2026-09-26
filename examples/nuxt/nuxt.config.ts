// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  ssr: false,
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
    // The example needs a client-only `payer`, which module options cannot
    // carry, so it installs `createSolanaPlugin` itself in
    // `app/plugins/demo-payer.client.ts`. Keep the module for the auto-imports.
    clientPlugin: false,
  },
});
