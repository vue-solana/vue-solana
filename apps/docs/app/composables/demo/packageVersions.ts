import docsPackage from "../../../package.json";

// ponytail: one string. Import the version directly instead of dragging the
// whole package.json into the client bundle to map over a single-element array.
// No `^[~^]` strip is needed: `docs-package-policy.test.ts` fails the build if
// the pin is ever a range or `workspace:*`, so the value is always a bare
// version. Restore the strip only if that policy test is relaxed.
export const packageVersions = [
  { name: "@vue-solana/nuxt", version: docsPackage.dependencies["@vue-solana/nuxt"] },
];
