# @vue-solana/nuxt

## 0.2.3

### Patch Changes

- Updated dependencies [d8e0732]
  - @vue-solana/vue@0.2.3

## 0.2.2

### Patch Changes

- 421b8bc: Avoid loading Solana RPC and wallet dependencies during Nuxt server rendering by registering the Nuxt runtime plugin as client-only and skipping the Vue plugin's automatic RPC check on the server.
- Updated dependencies [421b8bc]
  - @vue-solana/vue@0.2.2

## 0.2.1

### Patch Changes

- b0b6ed2: Add a timeout and stale-result guard for RPC connection checks so `useRpc()` and `useSolanaRpc()` cannot remain stuck in the `checking` state indefinitely.
- b0b6ed2: Update package README example links and documentation GitHub links to open in a new tab.
- Updated dependencies [b0b6ed2]
- Updated dependencies [b0b6ed2]
  - @vue-solana/vue@0.2.1
  - @vue-solana/core@0.2.1

## 0.2.0

### Minor Changes

- f3d4e80: add wallet adapter support

### Patch Changes

- Updated dependencies [f3d4e80]
  - @vue-solana/core@0.2.0
  - @vue-solana/vue@0.2.0

## 0.1.3

### Patch Changes

- Updated dependencies [8eea9c3]
  - @vue-solana/vue@0.1.3

## 0.1.2

### Patch Changes

- c0446cc: Update package README files and homepage links.
- Updated dependencies [c0446cc]
  - @vue-solana/core@0.1.2
  - @vue-solana/vue@0.1.2
