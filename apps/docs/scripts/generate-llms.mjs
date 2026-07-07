import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const contentDir = join(rootDir, "content");
const publicDir = join(rootDir, "public");
const siteUrl = "https://vue-solana-docs.vercel.app";

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

function fullUrl(route) {
  return route === "/" ? `${siteUrl}/` : `${siteUrl}${route}`;
}

function sortPages(a, b) {
  if (a.surroundOrder !== b.surroundOrder) {
    return a.surroundOrder - b.surroundOrder;
  }

  return a.route.localeCompare(b.route);
}

function makeLlmsTxt(pages) {
  const pageLinks = pages
    .map((page) => `- [${page.title}](${fullUrl(page.route)}): ${page.description}`)
    .join("\n");

  return `# Vue Solana\n\n> Vue and Nuxt libraries that help developers use Solana from Vue applications.\n\nOfficial docs: ${siteUrl}\nRepository: https://github.com/vue-solana/vue-solana\n\n## Packages\n\n- @vue-solana/core: Framework-agnostic Solana config, endpoint helpers, wallet types, and transaction helpers.\n- @vue-solana/vue: Vue plugin and composables for RPC, wallets, balances, messages, signatures, and transactions.\n- @vue-solana/nuxt: Nuxt module that installs the Vue plugin and auto-imports composables.\n\n## Install\n\n\`\`\`sh\npnpm add @vue-solana/nuxt\npnpm add @vue-solana/vue\npnpm add @vue-solana/core\n\`\`\`\n\nInstall only the package needed by your app. Nuxt apps normally install @vue-solana/nuxt. Vue apps normally install @vue-solana/vue.\n\n## Docs\n\n${pageLinks}\n\n## Crawling Notes\n\n- /demo is an interactive demo route and is intentionally excluded from robots.txt and sitemap.xml.\n- For full plain-text documentation, read ${siteUrl}/llms-full.txt.\n`;
}

function makeLlmsFullTxt(pages) {
  const sections = pages
    .map((page) => {
      return `# ${page.title}\n\nSource: ${fullUrl(page.route)}\nDescription: ${page.description}\n\n${removeDemoLinks(page.body)}`;
    })
    .join("\n\n---\n\n");

  return `# Vue Solana Full Documentation\n\nOfficial docs: ${siteUrl}\nGenerated from apps/docs/content Markdown files.\nThe /demo route is intentionally excluded because it is an interactive, non-canonical demo page.\n\n---\n\n${sections}\n`;
}

function removeDemoLinks(body) {
  return body
    .split("\n")
    .filter((line) => !line.includes("](/demo)") && !line.includes(`${siteUrl}/demo`))
    .join("\n")
    .trim();
}

const files = await collectMarkdownFiles(contentDir);
const pages = await Promise.all(
  files.map(async (filePath) => {
    const parsed = parseMarkdown(await readFile(filePath, "utf8"));

    return {
      ...parsed,
      route: routeFromFile(filePath),
      title: parsed.title ?? routeFromFile(filePath),
      description: parsed.description ?? "Vue Solana documentation page.",
    };
  }),
);

pages.sort(sortPages);

await mkdir(publicDir, { recursive: true });
await writeFile(join(publicDir, "llms.txt"), makeLlmsTxt(pages), "utf8");
await writeFile(join(publicDir, "llms-full.txt"), makeLlmsFullTxt(pages), "utf8");
