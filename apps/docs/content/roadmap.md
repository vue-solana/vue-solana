---
title: Roadmap
description: Planned features and improvements for Vue Solana.
ogSection: Roadmap
surroundOrder: 19
---

The packages are stable for production use with RPC reads, wallet discovery and connection, balance lookup, transactions, account reads, message signing, normalized error handling, Sign In With Solana, batch transaction signing and sending, transaction planning, SWR cache adapters, and SPL token helpers. This roadmap describes what comes next, ordered by impact rather than tied to a specific release.

## Transactions

### Transaction Simulation Helpers

Simulate transactions before submission so apps can preview fees, account changes, and likely failures without spending SOL.

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
