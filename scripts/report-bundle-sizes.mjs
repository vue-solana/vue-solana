import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";

const root = resolve(import.meta.dirname, "..");

/**
 * Reports what a consumer's bundler would ship for each public entry, the
 * number Bundlephobia shows: the entry's whole static graph, minified, with
 * `vue` external (every consumer already has it). Dynamic `import()` targets
 * are split into their own chunks and not counted, matching what lands in the
 * initial chunk.
 *
 * Report only, no budgets: `check-lean-imports.mjs` is the gate for heavy
 * edges, this prints the numbers so a regression is visible in the CI log.
 */
const PACKAGES = [
  {
    name: "@vue-solana/core",
    dir: "packages/core",
    // Root plus the subpaths users pick for size; the rest are covered by
    // the root barrel.
    entries: ["index", "kit", "ios-wallet", "mobile-wallet", "buffer-polyfill", "solana-pay"],
  },
  {
    name: "@vue-solana/vue",
    dir: "packages/vue",
    entries: readdirSync(resolve(root, "packages/vue/dist"))
      .filter((name) => name.endsWith(".mjs"))
      .map((name) => name.slice(0, -".mjs".length))
      .sort((a, b) => (a === "index" ? -1 : b === "index" ? 1 : a.localeCompare(b))),
  },
  {
    name: "@vue-solana/nuxt",
    dir: "packages/nuxt",
    // The root entry is the module itself, which only runs inside `nuxt build`
    // and never ships to the browser. What does ship is the runtime plugin the
    // module injects (not an `exports` subpath, so it is measured by file) and
    // the two runtime subpaths apps import directly.
    entries: [
      "kit",
      "buffer-polyfill",
      { label: "@vue-solana/nuxt (runtime plugin)", source: "./dist/runtime/plugin.mjs" },
    ],
  },
];

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function measure(pkg, entry) {
  const source =
    typeof entry === "object"
      ? entry.source
      : entry === "index"
        ? pkg.name
        : `${pkg.name}/${entry}`;
  const specifier = typeof entry === "object" ? entry.label : source;
  // `export *` skips default exports, so a default-only module (the Nuxt
  // plugin) names `default` explicitly or it would tree-shake to nothing.
  const contents =
    typeof entry === "object"
      ? `export { default } from ${JSON.stringify(source)};`
      : `export * from ${JSON.stringify(source)};`;
  const result = await build({
    // An empty inline tsconfig stops esbuild from applying the workspace
    // `paths` aliases, which point `@vue-solana/*` at `src/`. Without it this
    // would measure source files instead of the published `dist` exports.
    tsconfigRaw: "{}",
    stdin: {
      contents,
      // Resolve from inside the package so its own dependencies are found the
      // way a consumer's node_modules would find them.
      resolveDir: resolve(root, pkg.dir),
    },
    bundle: true,
    minify: true,
    format: "esm",
    platform: "browser",
    splitting: true,
    outdir: "out",
    write: false,
    metafile: true,
    // `#app` is Nuxt's virtual runtime module, provided by every Nuxt app.
    external: ["vue", "#app"],
    logLevel: "silent",
  });

  const entryOutput = Object.entries(result.metafile.outputs).find(
    ([, output]) => output.entryPoint === "<stdin>",
  );
  const [entryPath, output] = entryOutput;
  const file = result.outputFiles.find((outputFile) => outputFile.path.endsWith(entryPath));

  // Static imports of shared chunks are part of the initial load too.
  let bytes = file.contents;
  for (const imported of output.imports) {
    if (imported.kind !== "import-statement" || imported.external) {
      continue;
    }
    const chunk = result.outputFiles.find((outputFile) => outputFile.path.endsWith(imported.path));
    bytes = Buffer.concat([bytes, chunk.contents]);
  }

  // The package roots (and the Nuxt plugin, which is what a Nuxt app loads in
  // their place) are the rows people look for first.
  const isPackageRoot = entry === "index" || typeof entry === "object";

  return { specifier, isPackageRoot, minified: bytes.length, gzip: gzipSync(bytes).length };
}

const rows = [];

for (const pkg of PACKAGES) {
  for (const entry of pkg.entries) {
    try {
      rows.push(await measure(pkg, entry));
    } catch (error) {
      console.error(`FAIL: could not bundle ${pkg.name}/${entry}: ${error.message}`);
      process.exitCode = 1;
    }
  }
}

// Bold only on a colour terminal; the `***` marker also survives CI logs and
// piped output, where escape codes would be noise.
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const bold = (text) => (useColor ? `\x1b[1m${text}\x1b[22m` : text);
const MARKER = "*** ";

const width = Math.max(...rows.map((row) => row.specifier.length)) + MARKER.length;
console.log(`\n${"entry".padEnd(width)}  ${"minified".padStart(10)}  ${"gzip".padStart(10)}`);
for (const row of rows) {
  const name = `${row.isPackageRoot ? MARKER : " ".repeat(MARKER.length)}${row.specifier}`;
  const line = `${name.padEnd(width)}  ${formatKb(row.minified).padStart(10)}  ${formatKb(row.gzip).padStart(10)}`;
  console.log(row.isPackageRoot ? bold(line) : line);
}
console.log("\n*** package root; vue and #app external; dynamic imports excluded");
