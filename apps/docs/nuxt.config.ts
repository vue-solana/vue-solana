// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxt/content'],
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2024-04-03',
  content: {
    experimental: {
      sqliteConnector: 'native',
    },
  },
  routeRules: {
    '/**': { prerender: true },
  },
})
