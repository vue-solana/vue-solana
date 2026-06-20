# @vue-solana/vue

## 0.3.3

### Patch Changes

- 337b99f: Document the installable Vue Solana Agent Skill in the published package READMEs.
- Updated dependencies [337b99f]
  - @vue-solana/core@0.3.3

## 0.3.2

### Patch Changes

- 5244d3b: Improve mobile wallet transaction completion handling across core transaction helpers and Vue transaction composables.

  Replace the dynamic `@solana/web3-compat` import in `useBalance()` with a static `PublicKey` import to avoid ineffective dynamic import warnings in consuming Vite/Rollup apps.

- Updated dependencies [5244d3b]
  - @vue-solana/core@0.3.2

## 0.3.1

### Patch Changes

- e22b88f: Fix Nuxt dev-mode wallet discovery by optimizing Solana mobile wallet dependencies and lazy-loading mobile wallet registration.
- Updated dependencies [e22b88f]
  - @vue-solana/core@0.3.1

## 0.3.0

### Minor Changes

- b2bd905: Add Solana Mobile Wallet Adapter registration and expose wallet metadata for unified browser and mobile wallet discovery.

### Patch Changes

- Updated dependencies [b2bd905]
  - @vue-solana/core@0.3.0

## 0.2.3

### Patch Changes

- d8e0732: Preserve connected wallet state when switching or clearing wallet selection.

## 0.2.2

### Patch Changes

- 421b8bc: Avoid loading Solana RPC and wallet dependencies during Nuxt server rendering by registering the Nuxt runtime plugin as client-only and skipping the Vue plugin's automatic RPC check on the server.

## 0.2.1

### Patch Changes

- b0b6ed2: Add a timeout and stale-result guard for RPC connection checks so `useRpc()` and `useSolanaRpc()` cannot remain stuck in the `checking` state indefinitely.
- b0b6ed2: Update package README example links and documentation GitHub links to open in a new tab.
- Updated dependencies [b0b6ed2]
  - @vue-solana/core@0.2.1

## 0.2.0

### Minor Changes

- f3d4e80: add wallet adapter support

### Patch Changes

- Updated dependencies [f3d4e80]
  - @vue-solana/core@0.2.0

## 0.1.3

### Patch Changes

- 8eea9c3: Handle automatic balance refresh failures without creating unhandled promise rejections.

## 0.1.2

### Patch Changes

- c0446cc: Update package README files and homepage links.
- Updated dependencies [c0446cc]
  - @vue-solana/core@0.1.2
