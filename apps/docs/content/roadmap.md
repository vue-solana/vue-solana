---
title: Roadmap
description: Planned features and improvements for Vue Solana.
ogSection: Roadmap
surroundOrder: 22
---

The packages are stable for production use with RPC reads, wallet discovery and connection, balance lookup, transactions, account reads, message signing, normalized error handling, Sign In With Solana, batch transaction signing and sending, transaction planning, SWR cache adapters, and SPL token helpers. This roadmap describes what comes next, ordered by impact rather than tied to a specific release.

## Current Audit And Next Steps

The 2026-11-18 audit found that none of the features listed here had shipped as a complete public feature, although several had partial foundations. Transaction simulation has since shipped; work on the remaining items in this order unless a user request changes the priority:

| Priority | Item                                                                                     | Status                                                                                                    | Next step                                                                                                                                                               |
| -------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | Transaction simulation helpers                                                           | Shipped through `simulateTransaction()`, `useSimulateTransaction()`, and `useSolanaSimulateTransaction()` | Track follow-ups in [`plans/use-simulate-transaction.md`](https://github.com/vue-solana/vue-solana/blob/main/plans/use-simulate-transaction.md).                        |
| 2        | iOS wallet lazy-loading                                                                  | Performance work, not a missing feature; about 58% of the eager `createSolanaPlugin` chunk is removable   | Schedule the focused change set in [`plans/bundle-performance-followups.md`](https://github.com/vue-solana/vue-solana/blob/main/plans/bundle-performance-followups.md). |
| 3        | Nuxt server RPC utilities                                                                | Missing; core can already be used manually in server code                                                 | Define a Nitro/server export with strict no-secret rules.                                                                                                               |
| 4        | Versioned docs                                                                           | Missing                                                                                                   | Build the archived `/v1/` docs and old-URL redirects.                                                                                                                   |
| Later    | Additional iOS wallets                                                                   | Phantom, Solflare, and Backpack shipped; Trust Wallet remains open                                        | Research provider-specific links and callbacks, then add behind `useWallets()`.                                                                                         |
| Later    | Anchor helpers, wallet modal/UI, desktop native wallets, RPC failover, advanced indexing | Missing; large API or architecture commitments                                                            | Keep here until each has a dedicated plan.                                                                                                                              |

Two older items are already covered: real-time subscriptions are implemented through `useSubscription()`, `useTrackedData()`, and the SWR adapters. The checked “desktop native wallets” item in `plans/native-wallet-plan.md` records a deferred decision, not an implementation.

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

Nuxt server utilities for server-side Solana RPC reads.

### Versioned Docs

Versioned docs: an archived legacy docs build under `/v1/` with a `v1 | latest` dropdown and old-URL redirects, for users who have not yet migrated to the Kit path.

## Resilience And Advanced Patterns

### RPC Provider Failover

RPC provider failover and rate-limit handling.

### Advanced Account Indexing

Advanced program account indexing patterns and caching.
