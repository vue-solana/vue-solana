import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

let failed = false;

/**
 * Phase 1: core lean entries must not contain heavy edges at all.
 */
const LEAN_ENTRIES = [
  "packages/core/dist/address.mjs",
  "packages/core/dist/errors.mjs",
  "packages/core/dist/timeout.mjs",
  "packages/core/dist/clusters.mjs",
  "packages/core/dist/types.mjs",
];
const FORBIDDEN = [
  "ios-wallet",
  "mobile-wallet",
  "tweetnacl",
  "wallet-standard-mobile",
  "@solana-mobile",
];

for (const entry of LEAN_ENTRIES) {
  const path = resolve(root, entry);
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    console.error(`FAIL: could not read ${entry}: ${error.message}`);
    failed = true;
    continue;
  }

  const hits = FORBIDDEN.filter((token) => text.includes(token));
  if (hits.length > 0) {
    console.error(`FAIL: ${entry} contains heavy edges: ${hits.join(", ")}`);
    failed = true;
  } else {
    console.log(`ok: ${entry}`);
  }
}

/**
 * Phase 2: the `@vue-solana/vue` eager graph.
 *
 * A bare `import { createSolanaPlugin } from "@vue-solana/vue"` pulls every
 * module reachable through *static* imports of `dist/index.mjs` into the
 * consumer's initial chunk, so one stray static edge is enough to put a heavy
 * platform module on the critical path. Dynamic `import()` edges are exempt on
 * purpose: that is how `@vue-solana/core/mobile-wallet` (~98 KB) is kept lazy.
 *
 * This walks the built ESM graph instead of grepping the entry file, because
 * unbuild/Rollup hoists most of the plugin behind `dist/shared/*` chunks and a
 * single-file grep would miss the real edge.
 */
const VUE_ENTRIES_DIR = "packages/vue/dist";
const PACKAGE_DIRS = {
  "@vue-solana/vue": "packages/vue/dist",
  "@vue-solana/core": "packages/core/dist",
};

// Never statically reachable from any Vue entry. Each one is either ~100 KB of
// Android-only code (kept behind a dynamic import in `src/plugin.ts`), a Node
// polyfill that must stay subpath-only, or an optional QR dependency.
const FORBIDDEN_STATIC = [
  "@vue-solana/core/mobile-wallet",
  "@vue-solana/core/buffer-polyfill",
  "@solana-mobile/",
  "qrcode",
  "buffer",
  "buffer/",
];

// Known debt, deliberately deferred: `src/plugin/wallet-registry.ts` imports
// `@vue-solana/core/ios-wallet` statically, which drags `tweetnacl` into the
// eager plugin chunk. Only the root entry may reach it (no composable may), and
// the refactor is tracked in plans/package-improvements-plan.md "Deferred
// scope" + plans/bundle-performance-followups.md. Remove these exemptions when
// the thin entry lands; the check then guards the win.
const IOS_DEBT_ENTRIES = new Set(["index.mjs"]);
const IOS_DEBT_SPECIFIERS = ["@vue-solana/core/ios-wallet", "tweetnacl"];

// `buffer-polyfill` is the subpath that is supposed to reach the polyfill.
const BUFFER_ENTRY = "buffer-polyfill.mjs";

const STATIC_IMPORT_PATTERNS = [
  /\bimport\s+[^;]*?\bfrom\s*["']([^"']+)["']/g,
  /\bimport\s*["']([^"']+)["']/g,
  /\bexport\s+[^;]*?\bfrom\s*["']([^"']+)["']/g,
];

function staticSpecifiers(file) {
  const text = readFileSync(file, "utf8");
  const specifiers = new Set();

  for (const pattern of STATIC_IMPORT_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      specifiers.add(match[1]);
    }
  }

  return [...specifiers];
}

function resolveSpecifier(specifier, fromFile) {
  if (specifier.startsWith(".")) {
    const base = resolve(dirname(fromFile), specifier);

    for (const candidate of [base, `${base}.mjs`, join(base, "index.mjs")]) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  for (const [name, dir] of Object.entries(PACKAGE_DIRS)) {
    if (specifier === name) {
      return resolve(root, dir, "index.mjs");
    }

    if (specifier.startsWith(`${name}/`)) {
      return resolve(root, dir, `${specifier.slice(name.length + 1)}.mjs`);
    }
  }

  return null;
}

function isForbidden(specifier, entryName) {
  // The `buffer-polyfill` subpath exists to reach the polyfill and nothing else.
  if (
    entryName === BUFFER_ENTRY &&
    (specifier === "buffer" ||
      specifier === "buffer/" ||
      specifier === "@vue-solana/core/buffer-polyfill")
  ) {
    return false;
  }

  return FORBIDDEN_STATIC.some(
    (token) =>
      specifier === token || specifier.startsWith(token.endsWith("/") ? token : `${token}/`),
  );
}

function walkEagerGraph(entryPath) {
  const visited = new Set();
  const localFiles = [];
  const specifiers = new Set();
  const unresolved = [];
  const queue = [entryPath];

  while (queue.length > 0) {
    const file = queue.pop();

    if (visited.has(file)) {
      continue;
    }

    visited.add(file);

    if (!existsSync(file)) {
      unresolved.push(file);
      continue;
    }

    localFiles.push(file);

    for (const specifier of staticSpecifiers(file)) {
      specifiers.add(specifier);

      const resolved = resolveSpecifier(specifier, file);

      if (resolved) {
        queue.push(resolved);
      } else if (specifier.startsWith(".")) {
        // A relative edge that resolves to nothing is a broken build output,
        // not a third-party leaf.
        unresolved.push(resolve(dirname(file), specifier));
      }
    }
  }

  return { localFiles, specifiers, unresolved };
}

const vueEntriesDir = resolve(root, VUE_ENTRIES_DIR);
const vueEntries = existsSync(vueEntriesDir)
  ? readdirSync(vueEntriesDir)
      .filter((name) => name.endsWith(".mjs"))
      .sort()
  : [];

if (vueEntries.length === 0) {
  console.error(`FAIL: ${VUE_ENTRIES_DIR} has no built entries (run pnpm build:packages first)`);
  failed = true;
}

let iosDebtBytes = 0;

for (const entryName of vueEntries) {
  const { localFiles, specifiers, unresolved } = walkEagerGraph(join(vueEntriesDir, entryName));
  const problems = [];

  if (unresolved.length > 0) {
    problems.push(
      `unresolvable static import target: ${unresolved
        .map((file) => file.replace(`${root}/`, ""))
        .join(", ")}`,
    );
  }

  for (const specifier of specifiers) {
    if (isForbidden(specifier, entryName)) {
      problems.push(`statically imports ${specifier} (must stay behind a dynamic import)`);
    }

    if (!IOS_DEBT_ENTRIES.has(entryName) && IOS_DEBT_SPECIFIERS.includes(specifier)) {
      problems.push(
        `statically imports ${specifier} (only index.mjs may reach the iOS wallet code)`,
      );
    }
  }

  if (IOS_DEBT_ENTRIES.has(entryName)) {
    // Allowed on purpose: measured and reported below instead of failing, so
    // the deferred refactor stays visible without keeping CI red.
    iosDebtBytes = localFiles
      .filter((file) => file.includes("ios-wallet"))
      .reduce((total, file) => total + statSync(file).size, 0);
  }

  if (problems.length > 0) {
    for (const problem of problems) {
      console.error(`FAIL: ${VUE_ENTRIES_DIR}/${entryName} ${problem}`);
    }

    failed = true;
  } else {
    console.log(`ok: ${VUE_ENTRIES_DIR}/${entryName}`);
  }
}

if (iosDebtBytes > 0) {
  console.log(
    `note: the Vue eager graph still carries the iOS wallet entry (${iosDebtBytes} bytes of built ESM, plus tweetnacl); tracked as deferred debt in plans/package-improvements-plan.md`,
  );
}

if (failed) {
  process.exit(1);
}
