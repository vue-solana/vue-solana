import { beforeAll, describe, expect, it, vi } from "vitest";

interface DocsNuxtConfig {
  routeRules: Record<string, { redirect?: string }>;
  sitemap: { urls: string[] };
}

let config: DocsNuxtConfig;

beforeAll(async () => {
  // `defineNuxtConfig` is a Nuxt auto-import; stub it so the real config
  // module can be evaluated outside a Nuxt build.
  vi.stubGlobal("defineNuxtConfig", (value: DocsNuxtConfig) => value);
  config = (await import("./nuxt.config")).default as unknown as DocsNuxtConfig;
  vi.unstubAllGlobals();
});

describe("docs sitemap", () => {
  it("derives one route per content page, with the index as the locale root", () => {
    expect(config.sitemap.urls).toContain("/");
    expect(config.sitemap.urls).toContain("/guides/wallets");
    expect(config.sitemap.urls).toContain("/es/guides/wallets");
    expect(config.sitemap.urls).toContain("/ko/guides/wallets");
    expect(config.sitemap.urls).toContain("/zh/guides/wallets");
  });

  // `readdirSync(..., { recursive: true })` reports platform separators, so an
  // unnormalised path leaks every locale file into the English list and turns
  // `guides\index` into a bogus route on Windows.
  it("never leaks locale files or platform separators into a route", () => {
    for (const url of config.sitemap.urls) {
      expect(url).not.toContain("\\");
      expect(url).not.toContain("locales");
      expect(url).not.toContain("index");
    }
  });

  it("keeps the pre-2.4 /concepts/wallets redirects for every locale", () => {
    // Redirects are never in the sitemap (no content file backs them), so this
    // has to be asserted separately or the old inbound URLs 404.
    for (const locale of ["", "/es", "/ko", "/zh"]) {
      expect(config.routeRules[`${locale}/concepts/wallets`]?.redirect).toBe(
        `${locale}/guides/wallets`,
      );
    }
  });
});
