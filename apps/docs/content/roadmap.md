---
title: v1 Roadmap
description: Planned feature work before the first stable Vue Solana package release.
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

Apps need stable error categories for user-facing wallet and transaction UI. v1 should normalize common failures such as no selected wallet, unsupported feature, user rejection, invalid address, timeout, and RPC failure.

### 7. Desktop Native Wallet Decision

Desktop native wallets are currently planned but not implemented. Before v1, the project should either implement a minimal supported adapter or explicitly defer desktop native support to post-v1 documentation.

### 8. Documentation, Examples, And Tests

Every v1 feature should be documented and covered by unit tests or E2E tests. The Vue Vite and Nuxt examples should demonstrate the stable v1 workflows on devnet.

## Post-v1 Candidates

These are useful but should not block the first stable release:

- SPL token helpers.
- Anchor provider and program helpers.
- A wallet modal or UI package.
- Nuxt server RPC utilities.
- Full desktop native wallet coverage if not included in v1.
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
