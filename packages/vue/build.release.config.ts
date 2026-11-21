import { resolve } from "node:path";
import { defineBuildConfig } from "unbuild";
import buildConfig from "./build.config";

type RollupOptions = { input: Record<string, string> };

const config = Array.isArray(buildConfig) ? buildConfig[0]! : buildConfig;
const entries = config.entries as string[];
const subpathEntries = entries.filter((entry) => entry !== "src/index");

// The declaration rollup keeps every entry's type graph in memory at once.
// With the full Vue entry list that needs more than 8 GB in CI, so build the
// declarations in small batches and the JavaScript once at the end.
const declarationChunks: string[][] = [["src/index"]];
for (let i = 0; i < subpathEntries.length; i += 9) {
  declarationChunks.push(subpathEntries.slice(i, i + 9));
}

const shared = {
  rollup: config.rollup,
  externals: config.externals,
};

export default defineBuildConfig([
  ...declarationChunks.map((chunk, index) => ({
    ...shared,
    // A non-empty entry keeps unbuild from skipping the declaration phase;
    // the hook replaces it with this batch before the DTS rollup starts.
    entries: ["src/buffer-polyfill"],
    declaration: true,
    clean: index === 0,
    // Intermediate batches cannot satisfy the export map on their own.
    failOnWarn: false,
    hooks: {
      "rollup:dts:options": (_ctx: unknown, options: RollupOptions) => {
        options.input = Object.fromEntries(
          chunk.map((entry) => [entry.replace(/^src\//, ""), resolve(process.cwd(), entry)]),
        );
      },
    },
  })),
  {
    ...shared,
    entries,
    declaration: false,
    clean: false,
  },
]);
