# vue-solana

Vue and Nuxt libraries for building Solana applications.

This project is early-stage. RPC and balance reads are usable; first-class browser wallet adapter support is planned.

## Packages

- [`@vue-solana/core`](https://www.npmjs.com/package/@vue-solana/core): framework-agnostic Solana configuration, RPC, and wallet primitives.
- [`@vue-solana/vue`](https://www.npmjs.com/package/@vue-solana/vue): Vue plugin and composables.
- [`@vue-solana/nuxt`](https://www.npmjs.com/package/@vue-solana/nuxt): Nuxt module wrapping the Vue package with auto-imported composables.

## Which Package Should I Use?

Use `@solana/web3-compat` directly if you only need raw Solana APIs such as `Connection`, `PublicKey`, and transactions.

Use [`@vue-solana/core`](https://www.npmjs.com/package/@vue-solana/core) if you want shared Solana config, cluster endpoint defaults, wallet types, and transaction helpers without Vue.

Use [`@vue-solana/vue`](https://www.npmjs.com/package/@vue-solana/vue) in Vue apps.

Use [`@vue-solana/nuxt`](https://www.npmjs.com/package/@vue-solana/nuxt) in Nuxt apps.

`@vue-solana/core` does not replace `@solana/web3-compat`. It builds on top of it and keeps shared Vue Solana behavior in one place.

## Clusters

Supported clusters:

- `mainnet-beta`: Solana mainnet. This is Solana's official mainnet cluster name. Use it for production apps and real SOL.
- `devnet`: developer network with free test SOL.
- `testnet`: validator and protocol testing network.
- `localnet`: local validator, usually `http://127.0.0.1:8899`.

Use `mainnet-beta` rather than `mainnet`. See [Solana Concepts For Vue Developers](./docs/solana-concepts.md) for more background.

## Install

For Vue:

```sh
pnpm add @vue-solana/vue @vue-solana/core @solana/web3-compat
```

For Nuxt:

```sh
pnpm add @vue-solana/nuxt @vue-solana/vue @vue-solana/core @solana/web3-compat
```

## Documentation

The dedicated Nuxt Content docs app lives at [`apps/docs`](./apps/docs). It adapts the current root `docs/` material into a navigable documentation site for the full Vue Solana ecosystem.

Run it locally:

```sh
pnpm dev:docs
```

Docs app pages:

- [Docs overview](./apps/docs/content/index.md)
- [Getting Started](./apps/docs/content/getting-started.md)
- [Solana For Vue Developers](./apps/docs/content/concepts/solana-for-vue-developers.md)
- [Clusters](./apps/docs/content/concepts/clusters.md)
- [Wallets](./apps/docs/content/concepts/wallets.md)
- [`@vue-solana/core`](./apps/docs/content/packages/core.md)
- [`@vue-solana/vue`](./apps/docs/content/packages/vue.md)
- [`@vue-solana/nuxt`](./apps/docs/content/packages/nuxt.md)
- [Vue Vite example docs](./apps/docs/content/examples/vue-vite.md)
- [Nuxt example docs](./apps/docs/content/examples/nuxt.md)
- [Troubleshooting](./apps/docs/content/troubleshooting.md)

Root `docs/` is kept for now as reference material:

- [Getting Started](./docs/getting-started.md)
- [Solana Concepts For Vue Developers](./docs/solana-concepts.md)
- [API Reference](./docs/api.md)
- [Wallet Support](./docs/wallets.md)
- [Troubleshooting](./docs/troubleshooting.md)
- [`@vue-solana/core` README](./packages/core/README.md)
- [`@vue-solana/vue` README](./packages/vue/README.md)
- [`@vue-solana/nuxt` README](./packages/nuxt/README.md)

## Development

```sh
pnpm install
pnpm typecheck
pnpm build:packages
pnpm dev:docs
```

## Example Apps

Small usage snippets are included in the package docs for quick reference. For a complete runnable flow, use the example apps:

- Vue Vite example: [`examples/vue-vite`](./examples/vue-vite)
- Nuxt example: [`examples/nuxt`](./examples/nuxt)
- Documentation app: [`apps/docs`](./apps/docs)

Run them from the repository root:

```sh
pnpm dev:vue
pnpm dev:nuxt
pnpm dev:docs
```

## Known Issues

### `@solana/web3-compat` Type Metadata

`@solana/web3-compat@0.0.21` currently has broken TypeScript metadata. Its package metadata points to `dist/types/index.d.ts`, but that file is not included in the published package.

This repository includes `types/web3-compat.d.ts` as a temporary shim so TypeScript can resolve the package while runtime imports still use `@solana/web3-compat`.

Consumer workaround:

If your app reports that TypeScript cannot find declarations for `@solana/web3-compat`, add a local declaration file such as `types/web3-compat.d.ts`:

```ts
declare module '@solana/web3-compat' {
  export type {
    Commitment,
    SendOptions,
    TransactionSignature
  } from '@solana/web3.js'
  export {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction,
    VersionedTransaction
  } from '@solana/web3.js'
}
```

Make sure the file is included by your `tsconfig.json`, for example by including `types/**/*.d.ts`.

TODO:

- [ ] Re-check this after each new `@solana/web3-compat` release.
- [ ] Remove `types/web3-compat.d.ts` once the package ships valid root declarations.
- [ ] Re-run `pnpm typecheck` and `pnpm build` after removing the shim.

## Project TODOs

- [ ] Add browser wallet adapter support.

Browser wallet adapter support is needed because the current packages define wallet primitives and composables, but they do not yet discover or connect to installed wallets like Phantom, Solflare, or Backpack. Without an adapter, apps can test RPC and balance reads, but wallet connect, sign, and send flows require manually passing an object that implements the `SolanaWallet` interface.
