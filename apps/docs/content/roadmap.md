---
title: v1 Roadmap
description: Planned feature work before the first stable Vue Solana package release.
surroundOrder: 19
---

Vue Solana is currently pre-v1. The packages are already usable for RPC setup, wallet discovery, wallet connection, balance reads, and devnet transaction flows, but a stable v1 release needs a few more production-oriented APIs.

The detailed implementation tracker lives in [`docs/plans/v1-roadmap.md`](https://github.com/vue-solana/vue-solana/blob/main/docs/plans/v1-roadmap.md). This page summarizes completed and remaining roadmap work for application developers.

## v1 Release Goals

- Stable public package exports and composable names.
- Real behavior for every documented public configuration option.
- Predictable wallet selection, reconnect, disconnect, and unsupported-feature handling.
- Transaction confirmation helpers in addition to signature submission.
- Reactive account and signature status composables.
- Message signing support for wallet-auth flows.
- Normalized wallet, transaction, RPC, timeout, and invalid-input errors.
- Clear desktop native wallet support status.
- Updated examples, package docs, tests, and E2E coverage.

## Roadmap Phases

### 1. Public API Stabilization

Status: complete. Every public option is either implemented or removed before v1. `autoConnect` is included in v1 as opt-in reconnect behavior for a previously selected wallet identity.

### 2. Wallet UX Foundations

Status: complete. Wallet selection survives reloads without connecting arbitrary installed wallets. v1 restores only the wallet the user selected previously, and auto-connects only when explicitly enabled.

### 3. Transaction Lifecycle

Status: complete. v1 includes confirmation helpers and reactive transaction status so apps can show progress from signing through confirmation or timeout.

### 4. Reactive Account Data

Status: complete. v1 includes account and signature status composables such as `useAccountInfo()` and `useSignatureStatus()`, with safe cleanup for subscriptions.

### 5. Message Signing And Capabilities

Status: complete. v1 includes wallet message signing with `signMessage`, `useSignMessage()`, and the Nuxt `useSolanaSignMessage()` auto-import. Active-wallet and discovered-wallet capability helpers let apps render the right UI for connect, disconnect, message signing, and transaction signing support.

### 6. Error Model

Status: complete. v1 normalizes common failures such as no selected wallet, unsupported feature, user rejection, invalid address, timeout, storage failure, and RPC failure into stable `SolanaError` codes for user-facing UI.

### 7. Desktop Native Wallet Decision

Status: complete. Desktop native wallet support is explicitly deferred from v1 and remains a post-v1 candidate. v1 keeps wallet selection unified through `useWallets()` and `useWallet()` without adding a desktop-native-specific public flow.

### 8. Documentation, Examples, And Tests

Status: complete. The docs app is the primary source of truth for v1 usage. Start with [Getting Started](/getting-started), then use the package references for [`@vue-solana/core`](/packages/core), [`@vue-solana/vue`](/packages/vue), and [`@vue-solana/nuxt`](/packages/nuxt) for public APIs. The [Wallets](/guides/wallets), [Transactions](/guides/transactions), [Account Reads](/guides/account-reads), [Message Signing](/guides/message-signing), and [Errors](/guides/errors) guides cover the stable v1 workflows without requiring source-code inspection.

The [Vue Vite example](/examples/vue-vite) and [Nuxt example](/examples/nuxt) demonstrate devnet-first usage, persisted wallet selection, wallet capability checks, message signing, transaction submission, confirmation status, explorer links, and unsupported-capability UI paths. Unit tests and Wallet Standard E2E coverage live in the repository test suite; run the verification commands below before tagging v1.

## Post-v1 Candidates

These are useful but should not block the first stable release:

- SPL token helpers.
- Anchor provider and program helpers.
- A wallet modal or UI package.
- Nuxt server RPC utilities.
- Desktop native wallet support.
- Additional iOS wallet providers.
- Advanced program account indexing patterns.
- RPC provider failover and rate-limit handling.

## Verification Before v1

Before tagging a stable release, run the full local verification suite:

```sh
pnpm lint
pnpm format
pnpm test
pnpm typecheck
pnpm build:packages
pnpm test:e2e
```

Real-network E2E can also be run manually when needed:

```sh
pnpm test:e2e:integration
```
