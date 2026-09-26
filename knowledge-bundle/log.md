# Knowledge Bundle Change Log

All notable changes to the knowledge bundle are documented here.

## 2026-09-26

### Updated

- Documented the official Kit transaction stack in `packages/core.md`: `createSolanaClient()` installs `solanaRpc()` plus `rpcAirdrop()`, bundles the transaction planner and RPC plan-sending executor, and accepts a `payer` (`TransactionSigner`) or a base64 `payerSecretKey`. An explicit `payer` wins over `payerSecretKey`.
- Added the `mainnet` cluster name (with `mainnet-beta` as a legacy alias) to `concepts/clusters.md`, `guides/rpc-and-clusters.md`, and `packages/core.md`.
- Updated `packages/vue.md` and `packages/nuxt.md` for the new `usePayer`/`useIdentity`, `usePlanTransaction(s)`, and `useSendTransaction(s)` composables: each requires a `payer` on the client, and a `null` capability counts as missing.
- Documented `solana.clientPlugin: false` for Nuxt apps that install their own payer plugin, so the module does not add a second Solana context.

## 2026-09-19

### Updated

- Added the React-parity composable surface to `packages/vue.md`: `useAction`, `useClientCapability`, `usePayer`/`useIdentity`, `usePlanTransaction`/`usePlanTransactions`, `useSignTransactions`, `useSignAndSendTransactions`, and `useSelectedWalletAccount` (with `SelectedWalletAccountProvider`) are now documented.
- Documented the `@vue-solana/core/action` subpath (`createSolanaActionStore`, `isAbortError`, `isSolanaActionAborted`, action store/state types) in `packages/core.md`.
- Expanded `packages/nuxt.md` to the full 27 auto-imported composables and noted that the Nuxt runtime plugin installs the selected wallet account context app-wide.
- Fixed legacy `connection` RPC examples in `guides/getting-started.md` (Vue and Nuxt now use `client.rpc.getLatestBlockhash().send()`).
- Corrected the balance example in `concepts/solana-for-vue-developers.md` to the Kit RPC and noted bigint numerics.
- Fixed the archived standalone install plan link in `index.md`.

## 2026-09-12

### Updated

- Documented the v2.0.0 Kit migration across the bundle: `concepts/web3-compat.md` archived as v1-only, `guides/kit-migration.md` rewritten to the shipped v2 state, packages/index.md / packages/core.md / packages/vue.md / packages/nuxt.md updated to the Kit-only API (no `connection`, no `web3` subpaths, `publicKey: Address`), and guides (getting-started, wallets, message-signing, troubleshooting) aligned to raw-byte transactions and `client.rpc`.

## 2025-07-17

### Restructured

- Renamed `docs/` to `knowledge-bundle/` with OKF frontmatter format.
- Moved plan files to top-level `plans/` directory.
- Split `wallets.md` into `guides/wallets.md`, `guides/wallet-android.md`, `guides/wallet-ios.md`, and `guides/message-signing.md`.
- Split `solana-concepts.md` into `concepts/solana-for-vue-developers.md` and `concepts/clusters.md`.
- Moved API docs to `packages/` directory with `packages/index.md` listing page.
- Extracted web3-compat workaround from `troubleshooting.md` into `concepts/web3-compat.md`.
- Added OKF frontmatter (type, title, description, tags, timestamp) to all knowledge files.
- Created `index.md` directory listing and `log.md` change log.
- Fixed cross-references in README.md, AGENTS.md, docs app files, locale roadmap files, and plan files.
