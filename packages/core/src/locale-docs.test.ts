import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Locale docs are translations of the English docs tree. Translations lag
 * silently when contributors edit the English source without updating the
 * locale copies, so this test pins the *structure* (not the prose) of every
 * mirrored file: same file set, same headings, same heading levels, same
 * order. It runs in `pnpm test` (and therefore in CI) next to the other
 * docs-alignment checks in `export-map-docs.test.ts`.
 */

const CONTENT_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../../apps/docs/content");
const LOCALES_DIR = join(CONTENT_DIR, "locales");
const LOCALES = readdirSync(LOCALES_DIR, { withFileTypes: true })
  .filter(
    (entry) =>
      entry.isDirectory() && entry.name === entry.name.toLowerCase() && entry.name.length === 2,
  )
  .map((entry) => entry.name);

const ENGLISH_DOC_EXTENSIONS = [".md"];

const FRONTMATTER_AND_HEADING = /^(#{1,6}) /;

/** Files whose locale structure intentionally differs from English. */
const STRUCTURE_EXEMPT_FILES = new Set<string>([]);

type Heading = { level: number };

function listMarkdownFiles(dir: string, prefix = ""): string[] {
  const entries = readdirSync(dir);

  return entries.flatMap((entry) => {
    const path = join(dir, entry);
    const relativePath = prefix ? `${prefix}/${entry}` : entry;

    if (statSync(path).isDirectory()) {
      return listMarkdownFiles(path, relativePath);
    }

    return ENGLISH_DOC_EXTENSIONS.some((extension) => entry.endsWith(extension))
      ? [relativePath]
      : [];
  });
}

function extractHeadings(path: string): Heading[] {
  const lines = readFileSync(path, "utf8").split("\n");
  const headings: Heading[] = [];
  let inFence = false;

  for (const line of lines) {
    if (line.startsWith("```")) {
      inFence = !inFence;
      continue;
    }

    if (inFence) {
      continue;
    }

    const match = FRONTMATTER_AND_HEADING.exec(line);

    if (match?.[1]) {
      headings.push({ level: match[1].length });
    }
  }

  return headings;
}

describe("locale docs structure", () => {
  it("discovers locale directories", () => {
    expect(LOCALES.length).toBeGreaterThan(0);
  });

  const englishFiles = listMarkdownFiles(CONTENT_DIR).filter(
    (file) => !file.startsWith("locales/"),
  );

  it.each(LOCALES)("%s mirrors the English docs file set", (locale) => {
    const localeDir = join(CONTENT_DIR, "locales", locale);
    const localeFiles = listMarkdownFiles(localeDir);

    const englishSet = new Set(englishFiles);
    const localeSet = new Set(localeFiles);

    const missing = englishFiles.filter((file) => !localeSet.has(file));
    const stale = localeFiles.filter((file) => !englishSet.has(file));

    expect(englishSet.size).toBeGreaterThan(0);
    expect(missing, `Missing locale files for ${locale}: ${missing.join(", ")}`).toEqual([]);
    expect(
      stale,
      `Locale files with no English counterpart for ${locale}: ${stale.join(", ")}`,
    ).toEqual([]);
  });

  describe.each(LOCALES)("%s heading structure", (locale) => {
    const localeDir = join(CONTENT_DIR, "locales", locale);

    it.each(englishFiles)("%s", (file) => {
      if (STRUCTURE_EXEMPT_FILES.has(file)) {
        return;
      }

      const localePath = join(localeDir, file);

      expect(existsSync(localePath), `Locale file missing for ${file}`).toBe(true);

      const englishHeadings = extractHeadings(join(CONTENT_DIR, file));
      const localeHeadings = extractHeadings(localePath);

      const englishLevels = englishHeadings.map((heading) => heading.level);
      const localeLevels = localeHeadings.map((heading) => heading.level);

      expect(
        localeLevels,
        [
          `Heading structure of locales/${locale}/${file} drifted from ${file}.`,
          `English:   ${englishLevels.join(" ")}`,
          `Locale:    ${localeLevels.join(" ")}`,
          `Add, remove, or translate the corresponding headings in the locale file.`,
        ].join("\n"),
      ).toEqual(englishLevels);
    });
  });
});
