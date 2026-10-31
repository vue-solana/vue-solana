import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { docsNavSections } from "./app/utils/docsNavigation";

/**
 * The previous/next links at the bottom of a docs page come from
 * `queryCollectionItemSurroundings("content", ...)` ordered by the
 * `surroundOrder` frontmatter value, not from `docsNavSections`. The two
 * drifted when the Solana Pay guide was inserted with `surroundOrder: 15`
 * (it landed after `packages/core` instead of after `guides/transactions`),
 * and `guides/e2e-testing` and `packages/core` both carried `14`, which made
 * the surroundings query ambiguous. These checks keep the footer chain
 * unique, contiguous, and in the order the sidebar shows.
 */

const CONTENT_DIR = join(dirname(fileURLToPath(import.meta.url)), "content");
const LOCALE_CODES = ["es", "ko", "zh"];

type PageOrder = { route: string; order: number | null };

function listPages(prefix = ""): string[] {
  const dir = prefix ? join(CONTENT_DIR, prefix) : CONTENT_DIR;

  return readdirSync(dir).flatMap((entry) => {
    if (!prefix && entry === "locales") return [];

    const relativePath = prefix ? `${prefix}/${entry}` : entry;

    if (statSync(join(CONTENT_DIR, relativePath)).isDirectory()) {
      return listPages(relativePath);
    }

    return entry.endsWith(".md") ? [relativePath] : [];
  });
}

function toRoute(relativePath: string) {
  const withoutExtension = relativePath.replace(/\.md$/, "");

  return withoutExtension === "index" ? "/" : `/${withoutExtension}`;
}

function readSurroundOrder(relativePath: string) {
  const match = readFileSync(join(CONTENT_DIR, relativePath), "utf8").match(
    /^surroundOrder: (\d+)$/m,
  );

  return match ? Number(match[1]) : null;
}

function collectOrders(prefix: string): PageOrder[] {
  return listPages(prefix).map((relativePath) => ({
    route: toRoute(prefix ? relativePath.slice(prefix.length + 1) : relativePath),
    order: readSurroundOrder(relativePath),
  }));
}

const englishPages = collectOrders("");

function expectWellFormedFooterChain(pages: PageOrder[]) {
  expect(pages.filter((page) => page.order === null).map((page) => page.route)).toEqual([]);

  const seen = new Map<number, string[]>();

  for (const page of pages) {
    if (page.order === null) continue;
    seen.set(page.order, [...(seen.get(page.order) ?? []), page.route]);
  }

  // Two pages with the same value make `queryCollectionItemSurroundings` pick
  // an arbitrary neighbour.
  expect([...seen.entries()].filter(([, routes]) => routes.length > 1)).toEqual([]);

  const orders = [...seen.keys()].sort((a, b) => a - b);

  expect(orders).toEqual(Array.from({ length: orders.length }, (_, index) => index + 1));
}

describe("docs surround order (en)", () => {
  it("gives every page a unique, contiguous surroundOrder", () => {
    expectWellFormedFooterChain(englishPages);
  });

  it("keeps every sidebar section in ascending surroundOrder", () => {
    const contentRoutes = new Set(englishPages.map((page) => page.route));
    const orderOf = new Map(
      englishPages
        .filter((page) => page.order !== null)
        .map((page) => [page.route, page.order as number]),
    );

    for (const section of docsNavSections) {
      const orders = section.links
        .map((link) => link.to)
        .filter((route) => contentRoutes.has(route))
        .map((route) => orderOf.get(route) as number);

      expect(orders).toEqual([...orders].sort((a, b) => a - b));
    }
  });
});

describe.each(LOCALE_CODES)("docs surround order (%s)", (code) => {
  const pages = collectOrders(`locales/${code}`);

  it("gives every page a unique, contiguous surroundOrder", () => {
    expectWellFormedFooterChain(pages);
  });

  it("mirrors the English numbering page for page", () => {
    const sortByRoute = (page: PageOrder) => [page.route, page.order] as const;

    expect(pages.map(sortByRoute).sort()).toEqual(englishPages.map(sortByRoute).sort());
  });
});
