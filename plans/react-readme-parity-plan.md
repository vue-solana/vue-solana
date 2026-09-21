# React README Parity Plan

Tracks closing the remaining gaps against `@solana/react` (version 8.3.0): the feature gaps from `plans/react-parity-plan.md` plus documentation depth our package READMEs do not cover. The TanStack Query adapter is out of scope; the parity plan already records it as not implemented.

When a plan item is implemented, strike it through. When every item under a feature is implemented, remove the plan items and leave only the checked feature title.

Priority labels, highest first:

- **P0** — Foundational, broadly demanded. Implement first.
- **P1** — High value, commonly needed, medium effort.
- **P2** — Nice to have, niche or low-demand, implement after P0/P1.

## Features

### [x] `useAirdrop` — P0

Small, self-contained devnet "fund this account" action built on the existing `useAction` machinery.

- [x] ~~Add `useAirdrop()` in `packages/vue` (a client with an airdrop plugin installed; naturally devnet/testnet/localnet).~~
- [x] ~~`dispatch(address, amount)` with the hook injecting the `AbortSignal`; `data` resolves to the `Signature` or `undefined` when the airdrop applied without a transaction (e.g. LiteSVM).~~
- [x] ~~Add `useSolanaAirdrop()` to the Nuxt module auto-imports and `packages/nuxt` docs.~~
- [x] ~~Add a row to the `packages/vue` API table plus a short usage snippet in the README.~~
- [x] ~~Add a row to `plans/react-parity-plan.md` (currently not listed there) and strike it through when done.~~
- [x] ~~Tests: dispatch success, abort on re-dispatch, undefined-data airdrop path.~~

### [x] ~~`useSendTransaction` / `useSendTransactions` — P1~~

~~Send via the client's transaction-sending capability (`ClientWithTransactionSending`), distinct from the wallet-based `useSignAndSendTransaction(s)`.~~

- [x] ~~Add `useSendTransaction()` and `useSendTransactions()` in `packages/vue`: sign, submit, and confirm one or multiple transactions from instruction/plan/transaction input.~~
- [x] ~~Add `useSolanaSendTransaction()` / `useSolanaSendTransactions()` to the Nuxt module auto-imports and docs.~~
- [x] ~~Add API table rows and snippets in the `packages/vue` README; document the transaction-planning prerequisite and the flexible input forms.~~
- [x] ~~Tests: instruction input, plan input, batch send, capability-missing fail-fast (via `useClientCapability`).~~

### [ ] Wallet Account Signer Adapters — P2

Expose a wallet account as `@solana/signers` interfaces for message/transaction modification and sending.

- [ ] Add `useWalletAccountMessageSigner(account)` returning a message signer (conservatively `MessageModifyingSigner`).
- [ ] Add `useWalletAccountTransactionSigner(account, chain)` returning a transaction signer (conservatively `TransactionModifyingSigner`).
- [ ] Add `useWalletAccountTransactionSendingSigner(account, chain)` returning `TransactionSendingSigner`.
- [ ] Add Nuxt auto-imports and API table rows and snippets for all three.
- [ ] Tests: signer object shapes, address mapping, chain guard (must begin with `solana:`).

## Deeper Concept Documentation

Documentation depth in our READMEs with no new features. Strike an item through only when the README prose covers it, not just a one-line API table row.

### [x] Per-attempt / per-connection cancellation — P0

For `useRequest`, `useSubscription`, and `useTrackedData` in `packages/vue` README:

- [x] ~~`getAbortSignal` option: a factory invoked per attempt/connection (initial fire plus every `refresh()` / `reconnect()`), natural fit for `AbortSignal.timeout(...)`.~~
- [x] ~~`refresh({ abortSignal })` / `reconnect({ abortSignal })` per-call overrides; explicitly passing `undefined` means no signal for that attempt.~~
- [x] ~~The factory is held in a ref synced to the latest render, so inline closures need no `useCallback`.~~
- [x] ~~Killing the hook entirely by passing `null` source/spec (`status: 'disabled'`), or by unmount.~~

### [x] `useAction` semantics — P0

Same spread as `@solana/react`:

- [x] ~~`fn` is held in a ref always pointing at the latest closure, so there is no deps array to maintain; each `dispatch` runs the most recently rendered `fn` while in-flight calls continue with the closure they captured.~~
- [x] ~~`dispatch` returns `Promise<TResult>`; awaiters that read the resolved value filter superseded calls (abort-error check) so a stale result is ignored.~~
- [x] ~~Calling `dispatch` again aborts the prior in-flight call.~~

### [ ] SWR adapter depth — P2

For the `swr` adapters in `packages/vue` README:

- [ ] Function sources are held in a ref (inline closure fine, no `useCallback`); SWR keys the cache off `key`, not fetcher identity.
- [ ] `getAbortSignal` runs on every SWR attempt (initial fire, focus/reconnect/poll revalidation, `mutate()`); `mutate()` has no per-attempt override.
- [ ] Without `getAbortSignal` the signal is a fresh never-aborting `AbortSignal`; SWR discards stale results rather than cancelling.
- [ ] "Why no action SWR?" rationale: `useSWRMutation` already covers it.
- [ ] Swap sources/specs by bumping the `key`; a stable key keeps the original connection/cache entry.

### [ ] Selected wallet account context depth — P2

For `useSelectedWalletAccount` / `SelectedWalletAccountProvider` in `packages/vue` README:

- [ ] Document the `filterWallet` prop (filter supported wallets, e.g. mainnet-capable) and `stateSync` prop (store/get/delete the persisted selection).
- [ ] Document the persistence identifier contract (`${walletName}:${accountAddress}` style storage key).

### [x] ~~Plugin setup depth — P1~~

~~For the Vue plugin docs in `packages/vue` README:~~

- [x] ~~Client reference stability: build at module scope, or re-create via memoization when config is reactive (e.g. a cluster toggle).~~
- [x] ~~When a plugin `.use()` is async, the context activates only after the plugin resolves; real RPC and wallet work should run after hydration.~~

### [x] ~~Wallet hook argument/returns shapes — P1~~

~~For the wallet composables in `packages/vue` README (`useSignMessage`, `useSignTransaction(s)`, `useSignAndSendTransaction(s)`):~~

- [x] ~~Document transaction input as raw `Uint8Array` wire bytes conforming to the Solana transaction schema.~~
- [x] ~~Document the `minContextSlot` option (slot at which any blockhash/nonce in the transaction is known to exist).~~
- [x] ~~Document return shapes: `signedTransaction` / `signature` fields, and that a wallet may modify the message/transaction before signing.~~
