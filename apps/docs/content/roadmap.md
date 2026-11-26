---
title: Roadmap
description: Planned features and improvements for Vue Solana.
ogSection: Roadmap
surroundOrder: 22
---

The packages are stable for production use with RPC reads, wallet discovery and connection, balance lookup, transactions, account reads, message signing, normalized error handling, Sign In With Solana, batch transaction signing and sending, transaction planning, SWR cache adapters, and SPL token helpers. This roadmap describes what comes next, ordered by impact rather than tied to a specific release.

## Current Audit And Next Steps

The 2026-11-18 audit found that none of the features listed here had shipped as a complete public feature at the time, although several had partial foundations. Simulation, Nuxt server RPC, and transaction history have shipped, and the transaction diagnostics join is implemented and pending release; work on the remaining items in this order unless a user request changes the priority:

| Priority | Item                                                                                                                             | Status                                                                                                              | Next step                                                                                                                                                                                   |
| -------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | Fee/compute-budget policy                                                                                                        | Planned                                                                                                             | Implement Phase 1 of the [feature queue plan](https://github.com/vue-solana/vue-solana/blob/main/plans/feature-queue-phases.md): policy over Kit setters, no sending or dynamic fee oracle. |
| 2        | Transaction diagnostics join                                                                                                     | Implemented; pending release                                                                                        | Phase 2: will ship through `@vue-solana/core/diagnostics`, `useTransactionDiagnostics()`, and `useSolanaTransactionDiagnostics()`; see [Errors](/guides/errors).                            |
| 3        | Token/portfolio reads                                                                                                            | Planned                                                                                                             | Phase 3: classic SPL reads first, Token-2022 behind an opt-in subpath.                                                                                                                      |
| 4        | Program-client reactivity                                                                                                        | Planned                                                                                                             | Phase 4: reactive adapters around Codama-generated clients; no codegen or registry.                                                                                                         |
| 5        | Bundle and SSR polish                                                                                                            | Parallel track                                                                                                      | Phase 5: iOS lazy-loading from [bundle follow-ups](https://github.com/vue-solana/vue-solana/blob/main/plans/deferred/bundle-performance-followups.md), SSR audit, and size guardrails.      |
| Shipped  | Transaction simulation helpers                                                                                                   | Shipped in 4.3.0 through `simulateTransaction()`, `useSimulateTransaction()`, and `useSolanaSimulateTransaction()`  | Record archived in [`plans/archived/use-simulate-transaction.md`](https://github.com/vue-solana/vue-solana/blob/main/plans/archived/use-simulate-transaction.md).                           |
| Shipped  | Nuxt server RPC utilities                                                                                                        | Shipped in 4.4.0 through `@vue-solana/nuxt/server` (`createServerSolanaClient()`, `useServerSolanaClient()`).       | See the Server-Side RPC During SSR section in the Nuxt package docs.                                                                                                                        |
| Shipped  | Transaction history                                                                                                              | Shipped in 4.5.0 through `getTransactionHistory()`, `useTransactionHistory()`, and `useSolanaTransactionHistory()`. | Record archived in [`plans/archived/transaction-history.md`](https://github.com/vue-solana/vue-solana/blob/main/plans/archived/transaction-history.md).                                     |
| Later    | Versioned docs, additional iOS wallets, Anchor helpers, wallet modal/UI, desktop native wallets, RPC failover, advanced indexing | Missing or deferred; larger API or architecture commitments                                                         | Keep here until each has a dedicated plan. See the [UI library report](https://github.com/vue-solana/vue-solana/blob/main/reports/Vue%20Solana%20UI%20library.md) for the UI decision.      |

Two older items are already covered: real-time subscriptions are implemented through `useSubscription()`, `useTrackedData()`, and the SWR adapters. The checked “desktop native wallets” item in `plans/deferred/native-wallet-plan.md` records a deferred decision, not an implementation.

## Transactions

### Transaction Simulation Helpers

Shipped: `simulateTransaction()` in core, `useSimulateTransaction()` in Vue, and `useSolanaSimulateTransaction()` in Nuxt simulate transactions before submission so apps can preview fees, account changes, and likely failures without spending SOL.

## Ecosystem Integrations

### Desktop Native Wallet Support

Desktop native wallet support through protocol links via the unified wallet flows.

### Additional iOS Wallet Providers

Support more iOS browser wallets beyond the current Phantom, Solflare, and Backpack universal links.

### Anchor Provider And Program Helpers

An Anchor provider and helpers for Anchor program accounts and instructions.

### Wallet Modal Or UI Package

A dedicated wallet modal or UI package with prebuilt connect and sign flows.

### Nuxt Server RPC Utilities

Shipped in 4.4.0: `createServerSolanaClient()` and `useServerSolanaClient()` from `@vue-solana/nuxt/server` read Solana data from Nitro server routes without exposing secrets.

### Versioned Docs

Versioned docs: an archived legacy docs build under `/v1/` with a `v1 | latest` dropdown and old-URL redirects, for users who have not yet migrated to the Kit path.

## Resilience And Advanced Patterns

### RPC Provider Failover

RPC provider failover and rate-limit handling.

### Advanced Account Indexing

Advanced program account indexing patterns and caching.
