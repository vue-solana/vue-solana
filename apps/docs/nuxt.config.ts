// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    "@nuxt/ui",
    "@nuxt/content",
    "@vue-solana/nuxt",
    "@vercel/analytics",
    "@nuxt/image",
    "@nuxtjs/seo",
  ],
  css: ["~/assets/css/main.css"],
  app: {
    head: {
      htmlAttrs: {
        lang: "en",
      },
      link: [
        { rel: "icon", type: "image/png", href: "/favicon.png" },
        { rel: "apple-touch-icon", href: "/favicon.png" },
      ],
    },
  },
  site: {
    url: "https://vue-solana-docs.vercel.app",
    name: "Vue Solana",
    description: "Documentation for Vue and Nuxt libraries that help developers use Solana.",
    defaultLocale: "en",
  },
  sitemap: {
    urls: [
      "/",
      "/agent-skill",
      "/concepts/clusters",
      "/concepts/solana-for-vue-developers",
      "/examples/nuxt",
      "/examples/vue-vite",
      "/getting-started",
      "/guides/account-reads",
      "/guides/errors",
      "/guides/message-signing",
      "/guides/rpc-and-clusters",
      "/guides/transactions",
      "/guides/wallets",
      "/packages/core",
      "/packages/nuxt",
      "/packages/vue",
      "/roadmap",
      "/troubleshooting",
    ],
    exclude: ["/demo"],
  },
  robots: {
    disallow: ["/demo"],
    sitemap: ["/sitemap.xml"],
  },
  ogImage: {
    defaults: {
      width: 1200,
      height: 630,
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
    "/concepts/wallets": { redirect: "/guides/wallets" },
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
