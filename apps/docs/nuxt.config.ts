// https://nuxt.com/docs/api/configuration/nuxt-config
import { readdirSync } from "node:fs";
import { join } from "node:path";

/** Content pages are server-rendered, not prerendered, so the sitemap cannot
 *  discover them. Derive the routes from the content tree instead of listing
 *  them — the hand-maintained copy rotted once already. */
function contentUrls(dir: string): string[] {
  return (
    readdirSync(join(import.meta.dirname, "content", dir), { recursive: true })
      .map(String)
      // `recursive: true` reports platform separators, so normalise first: the
      // `locales/` filter and the `index` rule below are both written for `/`.
      .map((entry) => entry.replaceAll("\\", "/"))
      .filter((entry) => entry.endsWith(".md") && !entry.startsWith("locales/"))
      .map((entry) => entry.replace(/\.md$/, "").replace(/(^|\/)index$/, ""))
      .map((route) => (route ? `/${route}` : "/"))
  );
}

const sitemapUrls = ["", "de", "es", "fr", "ja", "ko", "zh"].flatMap((locale) =>
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
    // MWA wallets bind the authorization to this identity and re-send it before
    // every signing request, so it must be the same on every page and locale.
    // Pinned rather than defaulted: before 4.1.4 the default was
    // `document.title`, and Phantom opened without a sign prompt.
    mobileWallet: {
      appIdentity: {
        name: "Vue Solana",
        uri: "https://vue-solana-docs.vercel.app",
        icon: "favicon.png",
      },
    },
  },
  content: {
    experimental: {
      sqliteConnector: "native",
    },
    build: {
      markdown: {
        // Shiki defaults to `material-theme-palenight`, a *dark* theme with pale
        // tokens (#BABED8, #89DDFF, #C3E88D…). `assets/css/main.css` paints the
        // light-mode `pre` background itself, so light mode was rendering
        // pale-on-pale at 1.3–2.7:1, far below WCAG AA. Of the bundled light
        // themes, only the high-contrast GitHub one clears 4.5:1 on `#f8fafc`
        // (min 4.81); its dark half clears 4.5:1 on `#020617` (min 9.51).
        highlight: {
          theme: {
            // `default` satisfies the content-module type; `light` is the key
            // shiki's implicit `defaultColor` looks for.
            default: "github-light-high-contrast",
            light: "github-light-high-contrast",
            dark: "github-dark-high-contrast",
          },
        },
      },
    },
  },
  i18n: {
    defaultLocale: "en",
    strategy: "prefix_except_default",
    detectBrowserLanguage: false,
    vueI18n: "./i18n.config.ts",
    locales: [
      { code: "en", name: "English", language: "en-US" },
      { code: "de", name: "Deutsch", language: "de-DE" },
      { code: "es", name: "Español", language: "es-ES" },
      { code: "fr", name: "Français", language: "fr-FR" },
      { code: "ja", name: "日本語", language: "ja-JP" },
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
    // `@nuxt/ui`'s ULink localizes every internal markdown link on locale
    // pages (via i18n's `$localePath`), so the OpenAPI link on a locale
    // about page resolves to `/de/openapi.json` and so on — but the spec is
    // a single unlocalized server route. Redirect the localized spellings to
    // the canonical URL instead of 404ing; `nuxt generate`'s link crawler
    // follows those hrefs and accepts 3xx responses, so this also keeps the
    // prerender green.
    "/de/openapi.json": { redirect: "/openapi.json" },
    "/es/openapi.json": { redirect: "/openapi.json" },
    "/fr/openapi.json": { redirect: "/openapi.json" },
    "/ja/openapi.json": { redirect: "/openapi.json" },
    "/ko/openapi.json": { redirect: "/openapi.json" },
    "/zh/openapi.json": { redirect: "/openapi.json" },
    "/demo": { ssr: false, prerender: false },
    "/de/demo": { ssr: false, prerender: false },
    "/es/demo": { ssr: false, prerender: false },
    "/fr/demo": { ssr: false, prerender: false },
    "/ja/demo": { ssr: false, prerender: false },
    "/ko/demo": { ssr: false, prerender: false },
    "/zh/demo": { ssr: false, prerender: false },
    // Not in the sitemap (they are redirects, so `contentUrls` never derives
    // them) but they are still live inbound links from the pre-2.4 docs.
    "/concepts/wallets": { redirect: "/guides/wallets" },
    "/de/concepts/wallets": { redirect: "/de/guides/wallets" },
    "/es/concepts/wallets": { redirect: "/es/guides/wallets" },
    "/fr/concepts/wallets": { redirect: "/fr/guides/wallets" },
    "/ja/concepts/wallets": { redirect: "/ja/guides/wallets" },
    "/ko/concepts/wallets": { redirect: "/ko/guides/wallets" },
    "/zh/concepts/wallets": { redirect: "/zh/guides/wallets" },
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
