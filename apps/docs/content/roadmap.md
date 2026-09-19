---
title: Roadmap
description: Planned features and improvements for Vue Solana.
ogSection: Roadmap
surroundOrder: 19
---

The packages are stable for production use with RPC reads, wallet discovery and connection, balance lookup, transactions, account reads, message signing, normalized error handling, Sign In With Solana, batch transaction signing and sending, transaction planning, SWR cache adapters, and SPL token helpers. This roadmap describes what comes next, ordered by impact rather than tied to a specific release.

## Transactions

- Transaction simulation helpers.

## Ecosystem Integrations

- Desktop native wallet support via protocol links through the unified wallet flows.
- Additional iOS wallet providers.
- Anchor provider and program helpers.
- A dedicated wallet modal or UI package.
- Nuxt server RPC utilities for server-side reads.
- Versioned docs: an archived legacy docs build under `/v1/` with a `v1 | latest` dropdown and old-URL redirects, for users who have not yet migrated to the Kit path.

## Resilience And Advanced Patterns

- RPC provider failover and rate-limit handling.
- Advanced program account indexing patterns and caching.
