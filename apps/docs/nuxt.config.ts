// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    "@nuxt/ui",
    "@nuxt/content",
    "@nuxtjs/i18n",
    "@vue-solana/nuxt",
    "@vercel/analytics",
    "@nuxt/image",
    "@nuxtjs/seo",
  ],
  css: ["~/assets/css/main.css"],
  app: {
    head: {
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
      "/es",
      "/agent-skill",
      "/es/agent-skill",
      "/concepts/clusters",
      "/es/concepts/clusters",
      "/concepts/solana-for-vue-developers",
      "/es/concepts/solana-for-vue-developers",
      "/examples/nuxt",
      "/es/examples/nuxt",
      "/examples/vue-vite",
      "/es/examples/vue-vite",
      "/getting-started",
      "/es/getting-started",
      "/guides/account-reads",
      "/es/guides/account-reads",
      "/guides/errors",
      "/es/guides/errors",
      "/guides/message-signing",
      "/es/guides/message-signing",
      "/guides/rpc-and-clusters",
      "/es/guides/rpc-and-clusters",
      "/guides/transactions",
      "/es/guides/transactions",
      "/guides/wallets",
      "/es/guides/wallets",
      "/packages/core",
      "/es/packages/core",
      "/packages/nuxt",
      "/es/packages/nuxt",
      "/packages/vue",
      "/es/packages/vue",
      "/roadmap",
      "/es/roadmap",
      "/troubleshooting",
      "/es/troubleshooting",
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
  i18n: {
    defaultLocale: "en",
    strategy: "prefix_except_default",
    detectBrowserLanguage: false,
    vueI18n: "./i18n.config.ts",
    locales: [
      { code: "en", name: "English", language: "en-US" },
      { code: "es", name: "Español", language: "es-ES" },
    ],
  },
  routeRules: {
    "/demo": { ssr: false, prerender: false },
    "/es/demo": { ssr: false, prerender: false },
    "/concepts/wallets": { redirect: "/guides/wallets" },
    "/es/concepts/wallets": { redirect: "/es/guides/wallets" },
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
