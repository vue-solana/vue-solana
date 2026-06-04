// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxtjs/color-mode', '@nuxt/ui', '@nuxt/content'],
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2024-04-03',
  colorMode: {
    preference: 'dark',
    classSuffix: '',
  },
  content: {
    experimental: {
      sqliteConnector: 'native',
    },
  },
  routeRules: {
    '/**': { prerender: true },
  },
})
