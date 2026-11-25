# Knowledge Bundle Change Log

All notable changes to the knowledge bundle are documented here.

## 2026-11-25

### Added

- Documented hosted RPC provider options in `concepts/clusters.md`: public-endpoint limitations, what to check before choosing (method availability, RU/CU metering, WebSockets/webhooks/gRPC, key placement), and free-tier figures for Chainstack Developer and Alchemy Free.
- Added hosted-RPC setup guidance to `guides/getting-started.md` (`endpoint` / optional `wsEndpoint`, Nuxt private runtime config with `useServerSolanaClient()`) and a throttling remedy to `guides/troubleshooting.md`.
- Updated the clusters frontmatter and `index.md` description so agents can discover the new RPC provider guidance, and linked the generic Solana concepts page to it.

## 2026-11-16

### Added

- Documented wallet account signer adapters in `packages/vue.md`: `useWalletAccountMessageSigner`, `useWalletAccountTransactionSigner`, and `useWalletAccountTransactionSendingSigner` expose a wallet account as Kit signer interfaces, with reactive account resolution, `solana:` chain validation, modifying-interface semantics, and wallet-backed sign/send behavior (including singular-first single-transaction sends, batch/fallback sequencing, a 120 s timeout, and `PartialSignAndSendError` on partial fallback failure).
- Added the matching Nuxt auto-imports (`useSolanaWalletAccountMessageSigner`, `useSolanaWalletAccountTransactionSigner`, `useSolanaWalletAccountTransactionSendingSigner`) to `packages/nuxt.md`.

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
