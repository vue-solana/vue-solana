// https://nuxt.com/docs/api/configuration/nuxt-config
import { readdirSync } from "node:fs";
import { join } from "node:path";

/** Content pages are server-rendered, not prerendered, so the sitemap cannot
 *  discover them. Derive the routes from the content tree instead of listing
 *  them — the hand-maintained copy rotted once already. */
function contentUrls(dir: string): string[] {
  return readdirSync(join(import.meta.dirname, "content", dir), { recursive: true })
    .map(String)
    .filter((entry) => entry.endsWith(".md") && !entry.startsWith("locales/"))
    .map((entry) => entry.replace(/\.md$/, "").replace(/(^|\/)index$/, ""))
    .map((route) => (route ? `/${route}` : "/"));
}

const sitemapUrls = ["", "es", "ko", "zh"].flatMap((locale) =>
  contentUrls(locale ? `locales/${locale}` : "").map((route) =>
    locale ? (route === "/" ? `/${locale}` : `/${locale}${route}`) : route,
  ),
);

export default defineNuxtConfig({
  modules: [
    "@nuxt/ui",
    "@nuxt/content",
    "@nuxtjs/i18n",
    "@vue-solana/nuxt",
    "@vercel/analytics",
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
    urls: sitemapUrls,
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
      { code: "ko", name: "한국어", language: "ko-KR" },
      { code: "zh", name: "中文", language: "zh-CN" },
    ],
  },
  routeRules: {
    "/openapi.json": {
      headers: {
        vary: "Accept, Accept-Encoding",
        "cache-control": "public, max-age=3600",
      },
    },
    "/demo": { ssr: false, prerender: false },
    "/es/demo": { ssr: false, prerender: false },
    "/ko/demo": { ssr: false, prerender: false },
    "/zh/demo": { ssr: false, prerender: false },
    "/**": {
      prerender: true,
      headers: {
        // Pages are content-negotiated (Accept: text/markdown vs HTML), so
        // caches must key on Accept (acceptmarkdown.com contract).
        vary: "Accept, Accept-Encoding",
      },
    },
  },
});
