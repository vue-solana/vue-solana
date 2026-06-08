// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ["@nuxt/ui", "@nuxt/content", "@vue-solana/nuxt", "@vercel/analytics"],
  css: ["~/assets/css/main.css"],
  compatibilityDate: "2024-04-03",
  solana: {
    cluster: "devnet",
  },
  content: {
    experimental: {
      sqliteConnector: "native",
    },
  },
  routeRules: {
    "/demo": { ssr: false },
    "/**": { prerender: true },
  },
});
