# React Feature Parity Plan

Tracks closing the feature gap against `@solana/react` (as of its published docs). When a plan item is implemented, strike it through. When every item under a feature is done, remove the items and leave only the checked feature title.

Priority labels, highest first:

- **P0** — Foundational. Unblocks several other plans and is broadly demanded. Implement first.
- **P1** — High value, commonly needed, medium effort.
- **P2** — Nice to have, niche or low-demand, implement after P0/P1.

| Feature                          | Priority | Depends on                       |
| -------------------------------- | -------- | -------------------------------- |
| `useAction`                      | P0       | —                                |
| `useRequest`                     | P0       | `useAction`                      |
| `useSubscription`                | P0       | —                                |
| `useTrackedData`                 | P1       | `useRequest` + `useSubscription` |
| `useClientCapability`            | P2       | —                                |
| `useSignIn` (SIWS)               | P1       | —                                |
| Wallet selection provider        | P1       | `useWallets`                     |
| `usePayer` / `useIdentity`       | P2       | —                                |
| Batch transaction sign/send      | P1       | —                                |
| Transaction planning             | P2       | —                                |
| Cache adapters (Vue Query / SWR) | P2       | `useRequest` + `useSubscription` |

## P0 — `useAction`

Generic async action state machine, the foundation for the other data composables.

- [ ] Add `useAction` to `@vue-solana/vue`: accepts any async function, tracks `{ data, dispatch, error, isRunning, reset, status }` through Vue state.
- [ ] Hold the function in a ref pointing at the latest closure; no deps array.
- [ ] Abort the previous in-flight call when `dispatch` is called again (fresh `AbortSignal` per dispatch).
- [ ] `dispatch` returns `Promise<TResult>` so callers can await and detect superseded calls.
- [ ] Vue adapter: wrap in a composable, expose reactive refs and a stable dispatch function.
- [ ] Re-implement `useTransaction` on top of `useAction` (or document it as the generic equivalent).
- [ ] Tests: status transitions, abort-on-redispatch, stale-closure freshness, error capture.

## P0 — `useRequest`

One-shot async request that re-fires when its source changes identity, with stale-while-revalidate.

- [ ] Add `useRequest` to `@vue-solana/vue`: accepts an async function `(signal) => Promise<T>` or Kit reactive store source; returns `{ data, error, status, refresh }`.
- [ ] Status set: `'fetching' | 'success' | 'error' | 'disabled'`.
- [ ] Re-fire whenever the source changes identity (watch the source ref, not a callback).
- [ ] `refresh()` re-fires manually; keep prior `data`/`error` populated while the new attempt runs.
- [ ] Accept `null` source to disable (reports `'disabled'`).
- [ ] `getAbortSignal` option for per-attempt cancellation (timeouts).
- [ ] Nuxt auto-import `useSolanaRequest`.
- [ ] Tests: re-fire on source change, stale-while-revalidate, disabled lifecycle, abort.

## P0 — `useSubscription`

Live data from RPC subscriptions and other reactive stream sources.

- [ ] Add `useSubscription` to `@vue-solana/vue`: accepts a Kit reactive stream source; returns `{ data, error, reconnect, status }`.
- [ ] Status set: `'loading' | 'loaded' | 'error' | 'disabled'`.
- [ ] Accept `null` source to disable; tear down the store on unmount.
- [ ] `reconnect()` re-opens the connection with stale-while-revalidate.
- [ ] `getAbortSignal` option for per-connection cancellation.
- [ ] Nuxt auto-import `useSolanaSubscription`.
- [ ] Tests: subscribe, reconnect, error recovery, unmount cleanup.

## P1 — `useTrackedData`

RPC subscription seeded by a one-shot fetch, slot-deduped, for fast first paint plus live updates.

- [ ] Add `useTrackedData` to `@vue-solana/vue`: accepts `{ rpcRequest, rpcSubscriptionRequest, rpcValueMapper, rpcSubscriptionValueMapper }`; returns `{ data, error, refresh, status }`.
- [ ] Surface the `SolanaRpcResponse<TItem>` envelope so callers read `data.value` and `data.context.slot`.
- [ ] Slot-dedupe between the fetch and subscription sources (no out-of-order regressions).
- [ ] `refresh()` re-runs both; `getAbortSignal` for per-attempt cancellation.
- [ ] Nuxt auto-import `useSolanaTrackedData`.
- [ ] Tests: slot dedupe, out-of-order arrivals, refresh.

## P1 — `useSignIn` (Sign In With Solana)

Trigger a wallet's SIWS feature and verify the signed message.

- [ ] Add `useSignIn` to `@vue-solana/vue`: given a wallet/account, returns a function that triggers SIWS and resolves `{ account, signedMessage, signature }`.
- [ ] Nuxt auto-import `useSolanaSignIn`.
- [ ] Tests: happy path, rejection, wallet without SIWS support.
- [ ] Docs: server-side verification guidance.

## P1 — Wallet Selection Provider

Persist the selected wallet account app-wide with filtering, like `SelectedWalletAccountContextProvider`.

- [ ] Add `SelectedWalletAccountProvider` and `useSelectedWalletAccount` to `@vue-solana/vue`.
- [ ] Returns `[selectedAccount, setSelectedAccount, filteredWallets]`.
- [ ] `filterWallet` option restricts available wallets.
- [ ] `stateSync` option persists selection (`${walletName}:${accountAddress}`) to storage via `storeSelectedWallet` / `getSelectedWallet` / `deleteSelectedWallet`.
- [ ] Nuxt plugin installs the provider automatically; auto-import `useSolanaSelectedWalletAccount`.
- [ ] Tests: selection, persistence, filtering.

## P1 — Batch Transaction Sign/Send

Multi-transaction wallet requests.

- [ ] Add `useSignTransactions`: sign N serialized transactions in one request.
- [ ] Add `useSignAndSendTransactions`: sign and send N transactions in one request, returning N signatures.
- [ ] `minContextSlot` option passthrough.
- [ ] Nuxt auto-imports `useSolanaSignTransactions` / `useSolanaSignAndSendTransactions`.
- [ ] Tests: happy path, partial rejection.

## P2 — `useClientCapability`

Runtime assertion that a capability is installed on a loosely-typed client.

- [ ] Add `useClientCapability` to `@vue-solana/vue`: reads the client, asserts the requested capability at mount, throws a clear error with `hookName` + `providerHint` if missing.
- [ ] Accept an array of capability names.
- [ ] Tests: present, missing (throw), array form.

## P2 — `usePayer` / `useIdentity`

Reactively track the signer used to pay fees and the acting wallet identity.

- [ ] Add `usePayer` reading `client.payer`; re-render on change (subscribe if `subscribeToPayer` exists).
- [ ] Add `useIdentity` reading `client.identity`; re-render on change.
- [ ] Nuxt auto-imports `useSolanaPayer` / `useSolanaIdentity`.
- [ ] Tests: fixed client, subscribable client, no signer available.

## P2 — Transaction Planning

Plan transaction messages from instruction inputs without sending.

- [ ] Add `usePlanTransaction` wrapping the client's transaction planning capability; resolves to a single transaction message.
- [ ] Add `usePlanTransactions` for multiple messages (full plan).
- [ ] Nuxt auto-imports.
- [ ] Tests: single instruction, instruction plan, missing capability.

## P2 — Cache Adapters

Bridge reactive primitives into Vue data-fetching libraries, mirroring `@solana/react/swr` and `@solana/react/query`.

- [ ] Ship an opt-in subpath (e.g. `@vue-solana/vue/pinia-query` or SWR-for-Vue equivalent) with optional peer dependency.
- [ ] `useRequest*` adapter over `useRequest` semantics.
- [ ] `useSubscription*` adapter over `useSubscription` semantics.
- [ ] `useTrackedData*` adapter over `useTrackedData` semantics.
- [ ] Document why there is no `useAction` adapter (the cache lib's mutation hook is the equivalent).
- [ ] Tests: cache keying, disable via null source.
