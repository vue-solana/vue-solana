// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ["@nuxt/ui", "@nuxt/content", "@vue-solana/nuxt", "@vercel/analytics"],
  css: ["~/assets/css/main.css"],
  app: {
    head: {
      link: [
        { rel: "icon", type: "image/png", href: "/favicon.png" },
        { rel: "apple-touch-icon", href: "/favicon.png" },
      ],
    },
  },
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
    "/demo": { ssr: false, prerender: false },
    "/**": { prerender: true },
  },
  vite: {
    optimizeDeps: {
      include: ["tweetnacl", "tweetnacl/nacl-fast.js"],
      needsInterop: ["tweetnacl", "tweetnacl/nacl-fast.js"],
    },
  },
});
