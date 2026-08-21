# @vue-solana/core

## 1.1.0

### Minor Changes

- e04ae33: Add SPL token account helpers and composables: `useTokenAccounts`, `useTokenBalance`, token account query functions, and `@solana/spl-token` re-exports.

## 1.0.0

### Major Changes

- 5564b3c: Release v1.0.0 of the vue-solana monorepo. Stabilized public API, wallet UX foundations, transaction lifecycle, reactive account data, message signing, and comprehensive error handling for Vue and Nuxt Solana integrations.

## 0.7.2

### Patch Changes

- 25d5475: Simplify consumer installs by keeping low-level Solana and Buffer dependencies behind Vue Solana packages. `@vue-solana/core` owns the public `@vue-solana/core/web3` and `@vue-solana/core/buffer-polyfill` surfaces, while `@vue-solana/vue` and `@vue-solana/nuxt` now expose their own `web3` and `buffer-polyfill` subpaths so framework consumers do not need direct `@vue-solana/core`, `@solana/web3-compat`, or `buffer` installs for primary transaction examples.

  `@vue-solana/core` also publishes package-owned declaration shims for `@solana/web3-compat` and the `buffer/` subpath so fresh TypeScript consumers can import the core package, `@vue-solana/core/web3`, and `@vue-solana/core/buffer-polyfill` without adding local shims.

  Point the Nuxt package root declaration metadata at the generated ESM declaration so standalone TypeScript consumers can default-import the module from the package root.

## 0.7.1

### Patch Changes

- 16fd954: Improve package README structure for npm with badges, feature summaries, compatibility details, option tables, API tables, and caveats.

## 0.7.0

### Minor Changes

- e77115b: Add normalized Solana errors with stable error codes and use them across core helpers and Vue composables.

## 0.6.0

### Minor Changes

- c060c45: Add wallet message signing support and expose wallet capability flags for Vue and Nuxt applications.

## 0.5.1

### Patch Changes

- 739a418: Harden reactive account and signature composables, document new public account-data APIs, and keep package export/build metadata aligned.

## 0.5.0

### Minor Changes

- ed16ec2: Add transaction confirmation helpers, Vue confirmation state, and Nuxt auto-import support.

## 0.4.2

### Patch Changes

- 6e1f094: Harden native wallet callback handling and transaction signing result validation.

  Validate iOS wallet callback payloads, expire stale pending callback requests, clear consumed callback state on failures, and reject mismatched `signAllTransactions` results from iOS and Wallet Standard adapters. Also prevent stale balance refreshes from overwriting newer state and keep non-serializable Nuxt wallet instances out of public runtime config.

## 0.4.1

### Patch Changes

- f099ba0: Fix Nuxt docs demo loading with tweetnacl by improving Vite dependency interop handling and resolving tweetnacl safely in iOS wallet code.

## 0.4.0

### Minor Changes

- 04a4626: Add iOS mobile wallet support through the unified wallet flow.

  The core package now exports iOS wallet helpers and related wallet metadata, while the Vue plugin and Nuxt module can configure and expose the mobile wallet flow alongside existing browser wallet support.

## 0.3.3

### Patch Changes

- 337b99f: Document the installable Vue Solana Agent Skill in the published package READMEs.

## 0.3.2

### Patch Changes

- 5244d3b: Improve mobile wallet transaction completion handling across core transaction helpers and Vue transaction composables.

  Replace the dynamic `@solana/web3-compat` import in `useBalance()` with a static `PublicKey` import to avoid ineffective dynamic import warnings in consuming Vite/Rollup apps.

## 0.3.1

### Patch Changes

- e22b88f: Fix Nuxt dev-mode wallet discovery by optimizing Solana mobile wallet dependencies and lazy-loading mobile wallet registration.

## 0.3.0

### Minor Changes

- b2bd905: Add Solana Mobile Wallet Adapter registration and expose wallet metadata for unified browser and mobile wallet discovery.

## 0.2.1

### Patch Changes

- b0b6ed2: Update package README example links and documentation GitHub links to open in a new tab.

## 0.2.0

### Minor Changes

- f3d4e80: add wallet adapter support

## 0.1.2

### Patch Changes

- c0446cc: Update package README files and homepage links.
