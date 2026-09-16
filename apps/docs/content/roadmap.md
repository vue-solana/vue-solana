---
title: Roadmap
description: Planned features and improvements for Vue Solana.
ogSection: Roadmap
surroundOrder: 19
---

The packages are stable for production use with RPC reads, wallet discovery and connection, balance lookup, transactions, account reads, message signing, and normalized error handling. This roadmap describes what comes next, ordered by impact rather than tied to a specific release.

## Core Composables

- A generic `useAction` composable that wraps any async function and tracks `status`, `data`, `error`, and `dispatch` with abort support and ref-based fresh closures.
- A one-shot `useRequest` composable that re-fires reactively when its source changes, with stale-while-revalidate and per-attempt cancellation.
- A `useSubscription` composable for live RPC subscription streams (account notifications, slot notifications, logs) with reconnect, error recovery, and stale-while-revalidate.
- A `useTrackedData` composable that pairs an initial RPC fetch with a subscription and slot-dedupes the results for fast first paint plus live updates.
- A `useClientCapability` composable that asserts at mount time that a capability is installed on a loosely-typed client, with a clear error message otherwise.

## Wallet Features

- Sign In With Solana (`useSignIn`) for wallet-based authentication.
- A wallet selection context that persists the selected wallet account to storage and supports filtering available wallets.
- `usePayer` and `useIdentity` composables that reactively track the client's fee payer and acting identity.
- Batch transaction signing and sending (`useSignTransactions`, `useSignAndSendTransactions`) for multi-transaction wallet requests.

## Transactions

- Transaction planning composables (`usePlanTransaction`) that plan transaction messages from instruction inputs before signing.
- Transaction simulation helpers.
- Event subscription abstractions for real-time on-chain data.

## Ecosystem Integrations

- Cache adapters for Vue data-fetching libraries (Pinia-based Query or SWR equivalents) mirroring the `@solana/react` query adapters.
- SPL token account helpers and token balance composables built on the Kit client.
- Desktop native wallet support via protocol links through the unified wallet flows.
- Additional iOS wallet providers.
- Anchor provider and program helpers.
- A dedicated wallet modal or UI package.
- Nuxt server RPC utilities for server-side reads.
- Versioned docs: an archived legacy docs build under `/v1/` with a `v1 | latest` dropdown and old-URL redirects, for users who have not yet migrated to the Kit path.

## Resilience And Advanced Patterns

- RPC provider failover and rate-limit handling.
- Advanced program account indexing patterns and caching.
