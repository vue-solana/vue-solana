# @vue-solana/core

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
