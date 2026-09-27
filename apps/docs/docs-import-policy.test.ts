import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * This app is not the minimal-install case: it pins published versions and
 * depends on `@vue-solana/vue` and `@solana/kit` directly so every deep import
 * resolves. `@vue-solana/core` is deliberately *not* a dependency, because a
 * direct `@vue-solana/core/types` import does not resolve from app source even
 * though the published `.d.ts` files can resolve it from their own sibling in
 * the pnpm store. The two former offenders now name the type through
 * `app/composables/demo/types.ts`, which derives it from the auto-imported
 * `useSolanaWallets()`.
 *
 * A new core import is a regression: `nuxt build` erases type-only imports
 * without resolving them, so one that stops resolving stays silent. Kit symbols
 * belong to `@vue-solana/nuxt/kit`, the public types to the module root or the
 * `useSolana*` auto-imports.
 */
const DOCS_ROOT = dirname(fileURLToPath(import.meta.url));
const SOURCE_DIRS = ["app", "server", "scripts"];
const SOURCE_EXTENSIONS = [".ts", ".js", ".mjs", ".vue"];

function listSourceFiles(dir: string, prefix: string): string[] {
  return readdirSync(join(DOCS_ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      return listSourceFiles(`${dir}/${entry.name}`, `${prefix}/${entry.name}`);
    }

    return SOURCE_EXTENSIONS.some((extension) => entry.name.endsWith(extension))
      ? [`${prefix}/${entry.name}`]
      : [];
  });
}

const SOURCE_FILES = SOURCE_DIRS.flatMap((dir) => listSourceFiles(dir, dir));

/**
 * Matches the module specifier of a real `@vue-solana/core` import, including
 * side-effect, `require`, and dynamic `import()` forms. The keyword prefix keeps
 * plain string literals (the package name appears as a display label) out.
 */
const CORE_IMPORT =
  /(?:\bfrom\s+|\bimport\s+|\brequire\s*\(\s*|\bimport\s*\(\s*)["'`]@vue-solana\/core(?:\/[^"'`]*)?["'`]/;

function findCoreImports(): string[] {
  return SOURCE_FILES.filter((path) =>
    CORE_IMPORT.test(readFileSync(join(DOCS_ROOT, path), "utf8")),
  );
}

/**
 * Importers of `@vue-solana/core` that predate this guard. Empty today: both
 * former offenders were repointed and `@vue-solana/core` is not a dependency of
 * this app. Add an entry only for a file that genuinely cannot be repointed
 * until a release ships; the entry names the replacement to use when it lands.
 */
const KNOWN_CORE_IMPORTERS = new Map<string, string>();

describe("docs demo import policy", () => {
  it("adds no new @vue-solana/core imports", () => {
    expect(findCoreImports()).toEqual([...KNOWN_CORE_IMPORTERS.keys()]);
  });

  it("records the replacement for every known @vue-solana/core importer", () => {
    const undocumented = findCoreImports().filter((path) => !KNOWN_CORE_IMPORTERS.get(path));

    expect(
      undocumented,
      "New @vue-solana/core import. Import Kit symbols from '@vue-solana/nuxt/kit' and public " +
        "types from '@vue-solana/nuxt' (or the useSolana* auto-imports) so the docs app drops " +
        "back to installing only the Nuxt module, then list the file in KNOWN_CORE_IMPORTERS " +
        "only if it genuinely has to wait for a release.",
    ).toEqual([]);
  });
});
