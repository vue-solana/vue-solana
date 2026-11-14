// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import manifest from "./app/utils/llms-manifest.json";

const SITE_URL = manifest.siteUrl;
const LOCALES = manifest.locales.map((locale) => locale.code);
const SECTIONS = manifest.sections.map((section) => section.key);

/**
 * The generated agent surface is committed, so it can silently drift from the
 * content tree or grow back into a file no context window can hold (the
 * previous all-locale `llms-full.txt` was 1.86 MB / ~465k tokens). These
 * invariants are the same kind of guard as the package size budgets: they
 * fail on the regression, not on a rewrite of the copy.
 *
 * The generator is `scripts/generate-llms.mjs`; `pnpm llms` rewrites these
 * files, and `build`/`generate` run it first.
 */
const DOCS_ROOT = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(DOCS_ROOT, "content");
const PUBLIC_DIR = join(DOCS_ROOT, "public");

const MAX_INDEX_BYTES = 12_000;
const MAX_SECTION_BYTES = 8_000;
const MAX_LOCALE_BYTES = 12_000;
const MAX_CORPUS_BYTES = 320_000;

function walkMarkdown(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const entryPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      walkMarkdown(entryPath, out);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      out.push(entryPath);
    }
  }

  return out;
}

function routeFromFile(filePath: string): string {
  const path = relative(CONTENT_DIR, filePath)
    .split(sep)
    .join("/")
    .replace(/\.md$/, "")
    .replace(/^locales\//, "");

  return path === "index" ? "/" : `/${path.replace(/\/index$/, "")}`;
}

function localeFromRoute(route: string): string | undefined {
  return LOCALES.find((locale) => route === `/${locale}` || route.startsWith(`/${locale}/`));
}

function pagePath(route: string): string {
  const locale = localeFromRoute(route);
  return locale ? route.slice(locale.length + 1) || "/" : route;
}

function sectionFromPath(path: string): string {
  const segments = path.split("/").filter(Boolean);
  return segments.length > 1 ? segments[0]! : "root";
}

function fullUrl(route: string): string {
  return route === "/" ? `${SITE_URL}/` : `${SITE_URL}${route}`;
}

function readPublic(relativePath: string): string {
  return readFileSync(join(PUBLIC_DIR, relativePath), "utf8");
}

function countLink(markdown: string, route: string): number {
  return markdown.split(`](${fullUrl(route)})`).length - 1;
}

const ROUTES = walkMarkdown(CONTENT_DIR).map(routeFromFile).sort();
const ENGLISH_ROUTES = ROUTES.filter((route) => !localeFromRoute(route));
const LOCALE_ROUTES = Object.fromEntries(
  LOCALES.map((locale) => [locale, ROUTES.filter((route) => localeFromRoute(route) === locale)]),
) as Record<string, string[]>;

describe("generated index set", () => {
  it("contains no stale llms.txt indexes", () => {
    const expected = new Set<string>(["llms.txt", "llms-full.txt"]);

    for (const section of SECTIONS) {
      if (ENGLISH_ROUTES.some((route) => sectionFromPath(pagePath(route)) === section)) {
        expected.add(`${section}/llms.txt`);
      }
    }

    for (const locale of LOCALES) {
      if (LOCALE_ROUTES[locale]!.length > 0) {
        expected.add(`${locale}/llms.txt`);
      }
    }

    const actual = new Set<string>();

    for (const entry of readdirSync(PUBLIC_DIR, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.startsWith("llms") && entry.name.endsWith(".txt")) {
        actual.add(entry.name);
      } else if (entry.isDirectory() && existsSync(join(PUBLIC_DIR, entry.name, "llms.txt"))) {
        actual.add(`${entry.name}/llms.txt`);
      }
    }

    expect([...actual].sort()).toEqual([...expected].sort());
  });
});

describe("llms.txt root index", () => {
  const index = readPublic("llms.txt");

  it("lists every English page exactly once", () => {
    for (const route of ENGLISH_ROUTES) {
      expect(countLink(index, route), route).toBe(1);
    }
  });

  it("keeps translated pages out of the page sections", () => {
    for (const locale of LOCALES) {
      for (const route of LOCALE_ROUTES[locale]!) {
        expect(countLink(index, route), route).toBe(0);
      }
    }
  });

  it("points at the per-section and per-locale indexes", () => {
    for (const section of SECTIONS) {
      expect(index).toContain(`${SITE_URL}/${section}/llms.txt`);
    }

    for (const locale of LOCALES) {
      expect(index).toContain(`${SITE_URL}/${locale}/llms.txt`);
    }
  });

  it("states the corpus scope and a token estimate that matches the corpus", () => {
    const corpus = readPublic("llms-full.txt");
    const tokens = Math.round(corpus.length / 4);
    const estimate = tokens >= 1000 ? `~${Math.round(tokens / 1000)}k tokens` : `~${tokens} tokens`;

    expect(index).toContain("English-only single-file corpus");
    expect(index).toContain(estimate);
  });

  it("stays small enough to fit in an agent context", () => {
    expect(Buffer.byteLength(index)).toBeLessThanOrEqual(MAX_INDEX_BYTES);
  });
});

describe("per-section llms.txt indexes", () => {
  it("lists exactly the English pages under each section", () => {
    for (const section of SECTIONS) {
      const relativePath = `${section}/llms.txt`;

      if (!existsSync(join(PUBLIC_DIR, relativePath))) {
        expect(
          ENGLISH_ROUTES.filter((route) => sectionFromPath(pagePath(route)) === section),
          `${relativePath} is missing but its section has pages`,
        ).toHaveLength(0);
        continue;
      }

      const index = readPublic(relativePath);
      const sectionRoutes = ENGLISH_ROUTES.filter(
        (route) => sectionFromPath(pagePath(route)) === section,
      );
      const otherRoutes = ENGLISH_ROUTES.filter(
        (route) => sectionFromPath(pagePath(route)) !== section,
      );

      for (const route of sectionRoutes) {
        expect(countLink(index, route), `${relativePath} ${route}`).toBe(1);
      }

      for (const route of otherRoutes) {
        expect(countLink(index, route), `${relativePath} ${route}`).toBe(0);
      }

      expect(index.startsWith(`# Vue Solana — `)).toBe(true);
      expect(Buffer.byteLength(index)).toBeLessThanOrEqual(MAX_SECTION_BYTES);
    }
  });
});

describe("per-locale llms.txt indexes", () => {
  it("lists exactly the translated pages for that locale", () => {
    for (const locale of LOCALES) {
      const relativePath = `${locale}/llms.txt`;

      expect(existsSync(join(PUBLIC_DIR, relativePath)), relativePath).toBe(true);

      const index = readPublic(relativePath);

      for (const route of LOCALE_ROUTES[locale]!) {
        expect(countLink(index, route), `${relativePath} ${route}`).toBe(1);
      }

      for (const route of ENGLISH_ROUTES) {
        expect(countLink(index, route), `${relativePath} ${route}`).toBe(0);
      }

      expect(index).toContain(`${SITE_URL}/${locale}`);
      expect(index).toContain(`${SITE_URL}/llms.txt`);
      expect(Buffer.byteLength(index)).toBeLessThanOrEqual(MAX_LOCALE_BYTES);
    }
  });

  it("does not generate a full corpus per locale", () => {
    for (const locale of LOCALES) {
      expect(existsSync(join(PUBLIC_DIR, locale, "llms-full.txt")), locale).toBe(false);
    }
  });
});

describe("llms-full.txt corpus", () => {
  const corpus = readPublic("llms-full.txt");
  const sourceLines = corpus
    .split("\n")
    .filter((line) => line.startsWith(`Source: ${SITE_URL}`))
    .map((line) => line.slice("Source: ".length));

  it("contains every English page exactly once", () => {
    expect(sourceLines.slice().sort()).toEqual(ENGLISH_ROUTES.map(fullUrl).sort());
  });

  it("contains no translated pages", () => {
    for (const source of sourceLines) {
      expect(localeFromRoute(new URL(source).pathname), source).toBeUndefined();
    }
  });

  it("states its English-only scope", () => {
    expect(corpus).toContain(`Scope: English documentation only (${ENGLISH_ROUTES.length} pages)`);
  });

  it("stays within the one-shot corpus budget", () => {
    expect(Buffer.byteLength(corpus)).toBeLessThanOrEqual(MAX_CORPUS_BYTES);
  });
});
