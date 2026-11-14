import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const contentDir = join(rootDir, "content");
const publicDir = join(rootDir, "public");
const siteUrl = "https://vue-solana-docs.vercel.app";

/**
 * Generates the agent-facing surface described by llmstxt.org v2:
 *
 * - `/llms.txt`: small English index, grouped by section.
 * - `/<section>/llms.txt`: index for the pages under that path, so an agent
 *   that only needs the guides does not read the package reference first.
 * - `/<locale>/llms.txt`: index of the translated docs for that locale.
 * - `/llms-full.txt`: English-only one-shot corpus. It is deliberately not
 *   generated per locale (that produced a 1.86 MB, ~465k-token file).
 *
 * The spec has no `llms-full.txt`; it is kept as an explicitly optional
 * convenience and the index states its scope and approximate token count.
 */

const LOCALES = [
  {
    code: "de",
    name: "Deutsch",
    heading: "Dokumentation",
    intro: "Deutsche Übersetzung der Vue-Solana-Dokumentation.",
    summary: "German translation of the Vue Solana documentation.",
  },
  {
    code: "es",
    name: "Español",
    heading: "Documentación",
    intro: "Traducción al español de la documentación de Vue Solana.",
    summary: "Spanish translation of the Vue Solana documentation.",
  },
  {
    code: "fr",
    name: "Français",
    heading: "Documentation",
    intro: "Traduction française de la documentation Vue Solana.",
    summary: "French translation of the Vue Solana documentation.",
  },
  {
    code: "ja",
    name: "日本語",
    heading: "ドキュメント",
    intro: "Vue Solana ドキュメントの日本語訳です。",
    summary: "Japanese translation of the Vue Solana documentation.",
  },
  {
    code: "ko",
    name: "한국어",
    heading: "문서",
    intro: "Vue Solana 문서의 한국어 번역입니다.",
    summary: "Korean translation of the Vue Solana documentation.",
  },
  {
    code: "zh",
    name: "中文",
    heading: "文档",
    intro: "Vue Solana 文档的中文翻译。",
    summary: "Chinese translation of the Vue Solana documentation.",
  },
];

/**
 * Root pages that are about the project rather than about using the library.
 * Everything else at the content root lands in "Start Here", so a new root
 * page cannot silently disappear from the index.
 */
const PROJECT_ROUTES = new Set(["/showcase", "/roadmap", "/about", "/contact", "/privacy"]);

const DOC_SECTIONS = [
  {
    key: "guides",
    title: "Guides",
    summary: "Task-focused guides for RPC, wallets, transactions, and testing.",
  },
  {
    key: "packages",
    title: "Package Reference",
    summary: "API reference for the three published packages.",
  },
  {
    key: "concepts",
    title: "Concepts",
    summary: "Solana concepts that matter when writing Vue and Nuxt code.",
  },
  {
    key: "examples",
    title: "Examples",
    summary: "Runnable example applications wired to the workspace packages.",
  },
];

async function collectMarkdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        return collectMarkdownFiles(entryPath);
      }

      if (entry.isFile() && entry.name.endsWith(".md")) {
        return [entryPath];
      }

      return [];
    }),
  );

  return files.flat();
}

function parseMarkdown(source) {
  const frontmatterMatch = source.match(/^---\n([\s\S]*?)\n---\n?/);
  const frontmatter = frontmatterMatch?.[1] ?? "";
  const body = frontmatterMatch ? source.slice(frontmatterMatch[0].length) : source;

  return {
    body: body.trim(),
    title: readFrontmatterValue(frontmatter, "title"),
    description: readFrontmatterValue(frontmatter, "description"),
    surroundOrder: Number(readFrontmatterValue(frontmatter, "surroundOrder") ?? 999),
  };
}

function readFrontmatterValue(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.*)$`, "m"));
  const value = match?.[1]?.trim();

  if (!value) {
    return undefined;
  }

  return value.replace(/^['"]|['"]$/g, "");
}

function routeFromFile(filePath) {
  const path = relative(contentDir, filePath)
    .split(sep)
    .join("/")
    .replace(/\.md$/, "")
    .replace(/^locales\//, "");

  if (path === "index") {
    return "/";
  }

  return `/${path.replace(/\/index$/, "")}`;
}

function localeFromRoute(route) {
  const segment = route.split("/")[1];
  return LOCALES.some((locale) => locale.code === segment) ? segment : undefined;
}

/**
 * `route` keeps the locale prefix (`/de/getting-started`); `path` is the
 * locale-independent page path (`/getting-started`), which is what section
 * grouping and per-locale lookups use.
 */
function pathFromRoute(route) {
  const locale = localeFromRoute(route);
  return locale ? route.slice(locale.length + 1) || "/" : route;
}

function sectionFromPath(path) {
  const segments = path.split("/").filter(Boolean);

  return segments.length > 1 ? segments[0] : "root";
}

function fullUrl(route) {
  return route === "/" ? `${siteUrl}/` : `${siteUrl}${route}`;
}

function sortPages(a, b) {
  if (a.surroundOrder !== b.surroundOrder) {
    return a.surroundOrder - b.surroundOrder;
  }

  return a.route.localeCompare(b.route);
}

function linkLine(page) {
  return `- [${page.title}](${fullUrl(page.route)}): ${page.description}`;
}

function formatTokenEstimate(text) {
  const tokens = Math.round(text.length / 4);
  return tokens >= 1000 ? `~${Math.round(tokens / 1000)}k tokens` : `~${tokens} tokens`;
}

function makeSectionLinks(pages) {
  return pages.map(linkLine).join("\n");
}

function groupEnglishPages(englishPages) {
  const root = englishPages.filter((page) => sectionFromPath(page.path) === "root");
  const startHere = root.filter((page) => !PROJECT_ROUTES.has(page.path));
  const project = root.filter((page) => PROJECT_ROUTES.has(page.path));
  const groups = [
    { title: "Start Here", pages: startHere },
    ...DOC_SECTIONS.map((section) => ({
      title: section.title,
      pages: englishPages.filter((page) => sectionFromPath(page.path) === section.key),
    })),
    { title: "Project", pages: project },
  ];

  return groups.filter((group) => group.pages.length > 0);
}

function makeLlmsTxt(englishPages, corpus) {
  const groups = groupEnglishPages(englishPages);
  const sections = groups
    .map((group) => `## ${group.title}\n\n${makeSectionLinks(group.pages)}`)
    .join("\n\n");
  const translations = LOCALES.map(
    (locale) => `- [${locale.name}](${siteUrl}/${locale.code}/llms.txt): ${locale.summary}`,
  ).join("\n");
  const sectionIndexes = DOC_SECTIONS.filter((section) =>
    englishPages.some((page) => sectionFromPath(page.path) === section.key),
  )
    .map(
      (section) => `- [${section.title}](${siteUrl}/${section.key}/llms.txt): ${section.summary}`,
    )
    .join("\n");

  return `# Vue Solana

> Vue and Nuxt libraries that help developers use Solana from Vue applications.

Official docs: ${siteUrl}
Repository: https://github.com/vue-solana/vue-solana

## Packages

- @vue-solana/core: Framework-agnostic Solana config, endpoint helpers, wallet types, and transaction helpers.
- @vue-solana/vue: Vue plugin and composables for RPC, wallets, balances, messages, signatures, and transactions.
- @vue-solana/nuxt: Nuxt module that installs the Vue plugin and auto-imports composables.

## Install

\`\`\`sh
pnpm add @vue-solana/nuxt
pnpm add @vue-solana/vue
pnpm add @vue-solana/core
\`\`\`

Install only the package needed by your app. Nuxt apps normally install @vue-solana/nuxt. Vue apps normally install @vue-solana/vue.

## When To Use

Use Vue Solana when you are building, reviewing, or testing a Vue 3 or Nuxt application that talks to Solana:

- Setting up a Solana RPC connection with reactive state (useSolanaClient, useConnection, useRpc).
- Reading balances, account info, or SPL token accounts in components (useBalance, useAccountInfo, useTokenAccounts, useTokenBalance).
- Discovering and connecting wallets: browser extensions, Android Mobile Wallet Adapter, and iOS wallet links (useWallets, useWallet).
- Signing messages, sending transfers, and tracking confirmation with normalized errors (useSignMessage, useSignAndSendTransaction, useSignatureStatus, useTransactionConfirmation).
- Migrating a Vue or Nuxt codebase from @solana/web3.js to Solana Kit (see the Kit Migration guide).

Do not reach for Vue Solana when the project has no Vue/Nuxt layer: React, Svelte, Node scripts, or server-only services should use @solana/kit directly. Vue Solana is a thin, typed layer over Solana Kit, not a replacement for it.

How an agent should use this site:

1. Use this file for orientation and the sections below for page-level links.
2. Fetch only the pages you need as markdown with an Accept: text/markdown header, or by appending .md to the page URL.
3. Prefer the smallest index that covers the task: /guides/llms.txt, /packages/llms.txt, /concepts/llms.txt, or /examples/llms.txt.
4. Translated docs have their own index under /<locale>/llms.txt.
5. Use /llms-full.txt only when one request for the whole English corpus is cheaper than several page fetches.
6. For the machine-readable endpoint surface, fetch /openapi.json.

${sections}

## Section Indexes

${sectionIndexes}

## Translations

${translations}

## Optional

- [Full documentation corpus](${siteUrl}/llms-full.txt): English-only single-file corpus (${formatTokenEstimate(corpus)}). Fetch only when a whole-corpus read is cheaper than page-level fetches.
- [OpenAPI spec](${siteUrl}/openapi.json): OpenAPI 3.1 description of the machine-readable surface, error model, and versioning.
- [Sitemap](${siteUrl}/sitemap.xml): Complete URL list for crawlers.

## Crawling Notes

- /demo is an interactive demo route and is intentionally excluded from robots.txt and sitemap.xml.
- Every documentation page returns markdown when requested with Accept: text/markdown, or by appending .md to the page URL (for example ${siteUrl}/getting-started.md).
- Responses to negotiated pages always carry Vary: Accept, Accept-Encoding.
- Unmatched paths return a real HTTP 404; with Accept: text/markdown the 404 body is markdown listing recovery links.
- /llms-full.txt is English-only and intentionally larger than this index; translated pages are listed in their locale index instead.
`;
}

function makeSectionLlmsTxt(section, pages) {
  return `# Vue Solana — ${section.title}

> ${section.summary}

Official docs: ${siteUrl}
Parent index: ${siteUrl}/llms.txt

## ${section.title}

${makeSectionLinks(pages)}
`;
}

function makeLocaleLlmsTxt(locale, pages) {
  return `# Vue Solana — ${locale.name}

> ${locale.intro}

Official docs: ${siteUrl}/${locale.code}
Parent index: ${siteUrl}/llms.txt
English docs: ${siteUrl}/llms.txt

## ${locale.heading}

${makeSectionLinks(pages)}
`;
}

function makeLlmsFullTxt(englishPages) {
  const sections = englishPages
    .map((page) => {
      return `# ${page.title}\n\nSource: ${fullUrl(page.route)}\nDescription: ${page.description}\n\n${removeDemoLinks(page.body)}`;
    })
    .join("\n\n---\n\n");
  const translatedIndexes = LOCALES.map((locale) => `${siteUrl}/${locale.code}/llms.txt`).join(
    ", ",
  );

  return `# Vue Solana Full Documentation

> Vue and Nuxt libraries that help developers use Solana from Vue applications.

Official docs: ${siteUrl}
Repository: https://github.com/vue-solana/vue-solana
Scope: English documentation only (${englishPages.length} pages). Translated docs have their own indexes: ${translatedIndexes}.
Generated from apps/docs/content Markdown files.
The /demo route is intentionally excluded because it is an interactive, non-canonical demo page.

---

${sections}
`;
}

function removeDemoLinks(body) {
  return body
    .split("\n")
    .filter((line) => !line.includes("](/demo)") && !line.includes(`${siteUrl}/demo`))
    .join("\n")
    .trim();
}

async function writePublic(relativePath, content) {
  const filePath = join(publicDir, relativePath);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

const files = await collectMarkdownFiles(contentDir);
const pages = await Promise.all(
  files.map(async (filePath) => {
    const parsed = parseMarkdown(await readFile(filePath, "utf8"));
    const route = routeFromFile(filePath);
    const path = pathFromRoute(route);

    return {
      ...parsed,
      route,
      path,
      locale: localeFromRoute(route),
      title: parsed.title ?? route,
      description: parsed.description ?? "Vue Solana documentation page.",
    };
  }),
);

pages.sort(sortPages);

const englishPages = pages.filter((page) => !page.locale);
const corpus = makeLlmsFullTxt(englishPages);

await writePublic("llms.txt", makeLlmsTxt(englishPages, corpus));
await writePublic("llms-full.txt", corpus);

for (const section of DOC_SECTIONS) {
  const sectionPages = englishPages.filter((page) => sectionFromPath(page.path) === section.key);

  if (sectionPages.length > 0) {
    await writePublic(`${section.key}/llms.txt`, makeSectionLlmsTxt(section, sectionPages));
  }
}

for (const locale of LOCALES) {
  const localePages = pages.filter((page) => page.locale === locale.code);

  if (localePages.length > 0) {
    await writePublic(`${locale.code}/llms.txt`, makeLocaleLlmsTxt(locale, localePages));
  }
}
