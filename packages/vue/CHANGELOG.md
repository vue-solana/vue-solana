# @vue-solana/vue

## 0.7.0

### Minor Changes

- c060c45: Add wallet message signing support and expose wallet capability flags for Vue and Nuxt applications.

### Patch Changes

- Updated dependencies [c060c45]
  - @vue-solana/core@0.6.0

## 0.6.1

### Patch Changes

- 739a418: Harden reactive account and signature composables, document new public account-data APIs, and keep package export/build metadata aligned.
- Updated dependencies [739a418]
  - @vue-solana/core@0.5.1

## 0.6.0

### Minor Changes

- ed16ec2: Add transaction confirmation helpers, Vue confirmation state, and Nuxt auto-import support.

### Patch Changes

- Updated dependencies [ed16ec2]
  - @vue-solana/core@0.5.0

## 0.5.0

### Minor Changes

- 9809f38: Implement persisted wallet selection restore and opt-in `autoConnect` for previously selected wallets.

  Add optional timeout settings to `useTransaction()` with `timeoutMs` and `timeoutMessage`.

## 0.4.2

### Patch Changes

- 6e1f094: Harden native wallet callback handling and transaction signing result validation.

  Validate iOS wallet callback payloads, expire stale pending callback requests, clear consumed callback state on failures, and reject mismatched `signAllTransactions` results from iOS and Wallet Standard adapters. Also prevent stale balance refreshes from overwriting newer state and keep non-serializable Nuxt wallet instances out of public runtime config.

- Updated dependencies [6e1f094]
  - @vue-solana/core@0.4.2

## 0.4.1

### Patch Changes

- Updated dependencies [f099ba0]
  - @vue-solana/core@0.4.1

## 0.4.0

### Minor Changes

- 04a4626: Add iOS mobile wallet support through the unified wallet flow.

  The core package now exports iOS wallet helpers and related wallet metadata, while the Vue plugin and Nuxt module can configure and expose the mobile wallet flow alongside existing browser wallet support.

### Patch Changes

- Updated dependencies [04a4626]
  - @vue-solana/core@0.4.0

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
