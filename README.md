# vue-solana

Vue and Nuxt libraries for building Solana applications.

## Packages

- `@vue-solana/core`: framework-agnostic Solana configuration, RPC, and wallet primitives.
- `@vue-solana/vue`: Vue plugin and composables.
- `@vue-solana/nuxt`: Nuxt module wrapping the Vue package with auto-imported composables.

## Development

```sh
pnpm install
pnpm build
```

## Known Issues

### `@solana/web3-compat` Type Metadata

`@solana/web3-compat@0.0.21` currently has broken TypeScript metadata. Its package metadata points to `dist/types/index.d.ts`, but that file is not included in the published package.

This repository includes `types/web3-compat.d.ts` as a temporary shim so TypeScript can resolve the package while runtime imports still use `@solana/web3-compat`.

TODO:

- [ ] Re-check this after each new `@solana/web3-compat` release.
- [ ] Remove `types/web3-compat.d.ts` once the package ships valid root declarations.
- [ ] Re-run `pnpm typecheck` and `pnpm build` after removing the shim.

## Project TODOs

- [ ] Add browser wallet adapter support.
- [ ] Add a real Vue Vite example app.
- [ ] Add a real Nuxt example app.

Browser wallet adapter support is needed because the current packages define wallet primitives and composables, but they do not yet discover or connect to installed wallets like Phantom, Solflare, or Backpack. Without an adapter, apps can test RPC and balance reads, but wallet connect, sign, and send flows require manually passing an object that implements the `SolanaWallet` interface.
