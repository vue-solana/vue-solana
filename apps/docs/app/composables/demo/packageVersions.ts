import docsPackage from "../../../package.json";

// ponytail: one string. Import the version directly instead of dragging the
// whole package.json into the client bundle to map over a single-element array.
export const packageVersions = [
  { name: "@vue-solana/nuxt", version: docsPackage.dependencies["@vue-solana/nuxt"] },
];
