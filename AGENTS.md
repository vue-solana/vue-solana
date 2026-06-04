# AI Agent Handoff

This file tracks the current repository state, major changes made, and follow-up work so future AI agents can continue quickly.

## Repository Goal

Build a monorepo for Vue and Nuxt libraries that help developers use Solana from Vue applications, similar in spirit to Solana's React libraries but idiomatic for Vue/Nuxt.

## Current Architecture

The repository is a pnpm workspace with three initial packages:

- `@vue-solana/core`: framework-agnostic Solana primitives, config, RPC connection helpers, wallet types, and transaction helpers.
- `@vue-solana/vue`: Vue plugin, provide/inject context, and composables.
- `@vue-solana/nuxt`: Nuxt module that installs the Vue plugin and auto-imports composables.

Workspace files:

- `package.json`: root scripts and shared dev dependencies.
- `pnpm-workspace.yaml`: includes `packages/*` and `examples/*`.
- `tsconfig.base.json`: shared strict TypeScript config and workspace path aliases.
- `.gitignore`: ignores dependencies, build outputs, logs, env files, editor files, and temp files.

## Implemented Packages

### `packages/core`

Implemented files:

- `src/types.ts`: shared `SolanaConfig`, `SolanaContext`, `SolanaWallet`, and transaction types.
- `src/clusters.ts`: cluster names and endpoint resolution.
- `src/rpc.ts`: `createSolanaConnection()` and `createSolanaContext()`.
- `src/wallet.ts`: wallet connection assertions.
- `src/transaction.ts`: `signAndSendTransaction()` helper.
- `src/index.ts`: package exports.

### `packages/vue`

Implemented files:

- `src/plugin.ts`: `createSolanaPlugin()` and `VueSolana` alias.
- `src/injection.ts`: Vue injection key and context type.
- `src/composables/useSolana.ts`: access injected Solana context.
- `src/composables/useRpc.ts`: expose cluster, endpoint, and connection.
- `src/composables/useConnection.ts`: expose connection directly.
- `src/composables/useWallet.ts`: expose wallet state, connect, disconnect, and `setWallet()`.
- `src/composables/useBalance.ts`: read lamport balance for a public key/address.
- `src/composables/useTransaction.ts`: generic async transaction state helper.
- `src/composables/useSignAndSendTransaction.ts`: sign/send via current wallet.
- `src/index.ts`: package exports.

### `packages/nuxt`

Implemented files:

- `src/module.ts`: Nuxt module with `solana` config key.
- `src/runtime/plugin.ts`: installs the Vue Solana plugin using public runtime config.
- `src/runtime/types.ts`: augments Nuxt public runtime config.

Auto-imported Nuxt composables:

- `useSolana()`
- `useSolanaRpc()`
- `useSolanaConnection()`
- `useSolanaBalance()`
- `useSolanaWallet()`
- `useSolanaSignAndSendTransaction()`

## Solana Dependency Decision

The code was switched from `@solana/web3.js` to `@solana/web3-compat` after reviewing Solana's compatibility documentation.

Current package dependency:

- `@solana/web3-compat@^0.0.21`

Important detail: `@solana/web3-compat@0.0.21` currently has broken TypeScript package metadata. Its `package.json` points to `dist/types/index.d.ts`, but that file is not present in the published package.

Temporary workaround:

- `types/web3-compat.d.ts`

This shim allows TypeScript to resolve `@solana/web3-compat`. Runtime imports still use the real package.

Future agents should re-check new `@solana/web3-compat` versions and remove the shim once the package ships valid root declarations.

## Documentation Added

Updated docs:

- `README.md`: package overview, development commands, known `web3-compat` metadata issue, and project TODOs.
- `docs/getting-started.md`: install snippets, Vue setup, Nuxt setup, and detailed manual devnet testing guide.
- `examples/vue-vite/README.md`: placeholder for a future Vue Vite example.
- `examples/nuxt/README.md`: placeholder for a future Nuxt example.

The manual testing guide explains:

- Installing dependencies.
- Building packages.
- Running type checks.
- Installing a Solana browser wallet.
- Switching to devnet.
- Getting devnet SOL.
- Testing RPC reads.
- Testing balance reads.
- Testing the Nuxt module.
- Current wallet testing limitations.

## Verification Status

The following commands passed after the latest implementation work:

```sh
pnpm typecheck
pnpm build
```

Install completed with upstream peer/deprecation warnings from Nuxt/Solana dependencies, but no local build/typecheck failures remained.

## Known Limitations

### Browser Wallet Adapter Missing

The current packages define wallet primitives and expose `useWallet()`, but they do not yet discover or connect to installed browser wallets like Phantom, Solflare, or Backpack.

Why this matters:

- Real users connect through browser wallet extensions.
- The library needs wallet discovery before realistic connect/sign/send flows can work.
- Current wallet flows can only be tested by manually passing an object that implements the `SolanaWallet` interface.

Recommended next step:

- Add Solana Wallet Standard discovery and map selected wallets into the existing `SolanaWallet` interface.

### Example Apps

The `examples/vue-vite` and `examples/nuxt` directories contain runnable example apps wired to the workspace packages. They demonstrate plugin/module setup, RPC state, direct connection calls, balance reads, wallet state, and mock transaction flows.

## Suggested Next Tasks

- Add browser wallet adapter support using Solana Wallet Standard discovery.
- Add `useWallets()` or extend `useWallet()` to expose discovered wallets.
- Implement real connect/disconnect support for selected wallets.
- Map wallet signing methods to the existing `SolanaWallet` interface.
- Add unit tests for core helpers and Vue composables.
- Re-check `@solana/web3-compat` package metadata on every new release.

## Useful Commands

```sh
pnpm install
pnpm typecheck
pnpm build
pnpm clean
```

## Commit Message Used/Suggested

Suggested commit message for the initial scaffold:

```txt
chore: scaffold vue solana monorepo
```
