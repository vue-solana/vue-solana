import docsPackage from "../../../package.json";

const PACKAGE_NAMES = ["@vue-solana/core", "@vue-solana/vue", "@vue-solana/nuxt"] as const;

export const packageVersions = PACKAGE_NAMES.map((name) => ({
  name,
  version: docsPackage.dependencies[name].replace(/^[~^]/, ""),
}));
