// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ["@nuxt/ui", "@nuxt/content", "@vue-solana/nuxt", "@vercel/analytics", "@nuxt/image"],
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
      include: [
        "@vue-solana/nuxt > @solana/web3-compat > @solana/web3.js > eventemitter3",
        "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > buffer/",
        "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > tweetnacl",
        "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > tweetnacl/nacl-fast.js",
      ],
      needsInterop: [
        "@vue-solana/nuxt > @solana/web3-compat > @solana/web3.js > eventemitter3",
        "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > tweetnacl",
        "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > tweetnacl/nacl-fast.js",
      ],
    },
    $client: {
      optimizeDeps: {
        include: [
          "@vue-solana/nuxt > @solana/web3-compat > @solana/web3.js > eventemitter3",
          "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > buffer/",
          "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > tweetnacl",
          "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > tweetnacl/nacl-fast.js",
        ],
        needsInterop: [
          "@vue-solana/nuxt > @solana/web3-compat > @solana/web3.js > eventemitter3",
          "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > tweetnacl",
          "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > tweetnacl/nacl-fast.js",
        ],
      },
    },
  },
});
