# Vue Solana v1 Roadmap

This document tracks the remaining feature work and release criteria for the first stable `@vue-solana/*` package release.

The v1 goal is not to cover every Solana use case. The goal is to make the current core, Vue, and Nuxt packages stable enough that application developers can build production dapps without immediately outgrowing the public API.

## Release Criteria

Vue Solana is ready for v1 when these conditions are met:

- Public configuration options either work as documented or are removed before the stable release.
- Wallet selection, reconnect behavior, signing, disconnecting, and unsupported-wallet paths are predictable and tested.
- Transactions expose a practical lifecycle beyond returning a signature.
- Common account and signature reads are available as Vue composables.
- Wallet and transaction errors are normalized enough for apps to show useful UI.
- Desktop native wallet support is either implemented at a minimal supported level or explicitly deferred from v1 documentation.
- Published package exports and composable names are treated as stable.
- CI passes for linting, formatting, unit tests, type checking, package builds, and example E2E tests.

Before tagging v1, run:

```sh
pnpm lint
pnpm format
pnpm test
pnpm typecheck
pnpm build:packages
pnpm test:e2e
```

## Phase 1: Public API Stabilization

Status: complete.

The current packages expose a useful API, but v1 should not ship with public options that are only placeholders.

Tasks:

- [x] Decide whether `autoConnect` is part of v1.
- [x] If `autoConnect` ships, implement real persisted-wallet reconnect behavior.
- [x] If `autoConnect` does not ship, remove it from `SolanaConfig`, Nuxt module options, docs, and examples before v1. Not applicable because `autoConnect` ships.
- [x] Define stable public exports for `@vue-solana/core`, `@vue-solana/vue`, and `@vue-solana/nuxt`.
- [x] Confirm every documented subpath export exists in package export maps.
- [x] Add a v1 compatibility note for the current `@solana/web3-compat` dependency and its type metadata workaround.
- [x] Add package-facing changesets for any public API changes made during v1 work.

Acceptance criteria:

- No documented v1 option is described as reserved, planned, or unused.
- Package README files and `docs/api.md` agree on the public API surface.
- Existing consumers can identify any breaking changes from changesets and changelogs.

## Phase 2: Wallet UX Foundations

Status: complete.

Wallet discovery works today, but production apps need predictable selection restore and reconnect semantics.

Tasks:

- [x] Add a persisted wallet selection key with a documented storage format.
- [x] Persist only user-selected wallet identity, not private keys or sensitive wallet session data.
- [x] Restore the selected wallet on client boot when the same wallet is discovered again.
- [x] Implement `autoConnect` only for a previously selected wallet and only when explicitly enabled.
- [x] Never auto-connect an arbitrary installed wallet.
- [x] Keep SSR behavior inert when `window` and browser storage are unavailable.
- [x] Preserve manual wallet injection through `setWallet()`.
- [x] Ensure connecting a newly selected wallet disconnects any other connected adapted wallet.
- [x] Add tests for persistence, restore, disabled `autoConnect`, enabled `autoConnect`, missing wallet, storage failure, and SSR/no-window behavior.
- [x] Document wallet selection persistence and auto-connect behavior in Vue, Nuxt, and wallet docs.

Acceptance criteria:

- A selected wallet can be restored after reload without connecting unless `autoConnect` is enabled.
- `autoConnect` never connects a wallet the user did not previously select.
- Apps can still opt out by passing `autoConnect: false` or clearing selected wallet state.

## Phase 3: Transaction Lifecycle

Status: complete.

`signAndSendTransaction()` currently returns a signature. v1 apps also need confirmation and status handling.

Tasks:

- [x] Add a core helper for confirming a transaction signature.
- [x] Support caller-selected commitment, with safe defaults for common app flows.
- [x] Add a Vue composable such as `useTransactionConfirmation()`.
- [x] Consider adding confirmation options to `useSignAndSendTransaction()` without making the simple signature-only flow harder.
- [x] Track status values such as `idle`, `sending`, `sent`, `confirming`, `processed`, `confirmed`, `finalized`, and `error` where appropriate.
- [x] Preserve stale execution protection when multiple sends or confirmations overlap.
- [x] Add timeout handling with a clear error message for transactions that do not settle in time.
- [x] Document how apps should link to explorers after receiving a signature.
- [x] Update examples to show the difference between submitted and confirmed transactions.

Acceptance criteria:

- Apps can submit a transaction and reactively render confirmation progress.
- Apps can choose whether they want fire-and-forget signature behavior or confirmation waiting.
- Timeout and RPC errors can be surfaced without losing the submitted signature.

## Phase 4: Reactive Account Data

Status: complete.

`useBalance()` is useful, but v1 should include common account and signature reads as first-class composables.

Tasks:

- [x] Add `useAccountInfo(address, options?)` for one-shot account loading.
- [x] Add optional account subscription support with cleanup on component unmount.
- [x] Add `useSignatureStatus(signature, options?)` for polling or subscription-style status tracking.
- [x] Consider `useSlot()` or `useBlockHeight()` if needed for transaction freshness and UI status. Not needed for v1 because signature status and transaction confirmation cover the current freshness UI needs.
- [x] Include `useProgramAccounts()` in v1 with explicit RPC cost documentation and filter/data-slice support.
- [x] Add shared helpers for parsing public keys from strings, refs, and getters.
- [x] Add tests for valid input, invalid input, null input, refresh behavior, cleanup behavior, and stale responses.
- [x] Document RPC cost considerations for account and program account reads.

Acceptance criteria:

- Apps can read and optionally watch a Solana account without writing raw watcher lifecycle code.
- Null or invalid input fails predictably and does not spam RPC calls.
- Subscriptions are cleaned up when components unmount.

## Phase 5: Message Signing And Capabilities

Status: planned.

Many Solana apps use message signing for wallet authentication. v1 should support it where wallets expose it.

Tasks:

- [ ] Extend `SolanaWallet` with optional `signMessage` support.
- [ ] Adapt Wallet Standard message signing features when available.
- [ ] Add `useSignMessage()` to `@vue-solana/vue`.
- [ ] Auto-import the Nuxt alias, likely `useSolanaSignMessage()`.
- [ ] Expose active wallet capabilities from `useWallet()` as computed values.
- [ ] Include capability flags for connect, disconnect, sign message, sign transaction, sign all transactions, and sign-and-send transaction.
- [ ] Add tests for wallets with and without message signing support.
- [ ] Document wallet-auth patterns and clearly state that message signing is not transaction signing.

Acceptance criteria:

- Apps can detect whether the selected wallet can sign messages before rendering an auth button.
- Unsupported message signing produces a clear, typed or normalized error.
- Message signing works without weakening transaction signing boundaries.

## Phase 6: Error Model

Status: planned.

Apps need stable error categories for wallet and transaction UI. v1 should avoid forcing every app to inspect arbitrary thrown values.

Tasks:

- [ ] Add normalized error classes or error codes in `@vue-solana/core`.
- [ ] Cover no wallet selected, wallet not connected, unsupported wallet feature, user rejection, invalid address, transaction timeout, RPC failure, and storage failure.
- [ ] Preserve the original cause on normalized errors.
- [ ] Use normalized errors in core helpers and Vue composables.
- [ ] Document error handling examples for Vue and Nuxt apps.
- [ ] Add tests that assert stable error codes for common failure paths.

Acceptance criteria:

- Apps can switch on a stable error code for common UI branches.
- Original low-level wallet or RPC errors remain available for debugging.

## Phase 7: Desktop Native Wallet Decision

Status: planned.

Desktop native wallet support is currently documented as planned. The v1 release should make a deliberate decision.

Tasks:

- [ ] Research supported desktop native Solana wallet options and protocol-link behavior.
- [ ] Decide whether minimal desktop native wallet support is a v1 requirement.
- [ ] If included in v1, implement the smallest supported adapter through the existing `useWallets()` and `useWallet()` flow.
- [ ] If deferred, update README, package docs, docs app, and `docs/native-wallet-plan.md` to mark it as post-v1.
- [ ] Avoid adding separate public composables for desktop wallets unless the architecture is deliberately revised.
- [ ] Add tests or manual testing notes for whichever decision is made.

Acceptance criteria:

- v1 documentation does not leave desktop native wallet support ambiguous.
- The unified wallet flow remains the only public wallet selection path.

## Phase 8: Documentation, Examples, And Tests

Status: planned.

Every v1 feature should ship with docs and verification coverage.

Tasks:

- [ ] Update `docs/api.md` and docs app package pages for every new public API.
- [ ] Update the Vue Vite example with persisted wallet selection, transaction confirmation, and message signing examples.
- [ ] Update the Nuxt example with the same v1 flows using Nuxt auto-imports.
- [ ] Add mocked Wallet Standard E2E coverage for discovery, selection, connect, disconnect, and unsupported capabilities.
- [ ] Add unit tests for new core helpers and Vue composables.
- [ ] Add manual testing instructions for browser extensions, Android MWA, iOS deep-link wallets, and any desktop native wallet decision.
- [ ] Confirm package README files are consistent with the docs app.

Acceptance criteria:

- New users can discover v1 features from the docs app without reading source code.
- Examples demonstrate safe devnet usage and avoid mainnet transaction surprises.
- CI covers the stable v1 workflows.

## Suggested Implementation Order

1. Phase 1: Public API Stabilization.
2. Phase 2: Wallet UX Foundations.
3. Phase 6: Error Model.
4. Phase 3: Transaction Lifecycle.
5. Phase 4: Reactive Account Data.
6. Phase 5: Message Signing And Capabilities.
7. Phase 7: Desktop Native Wallet Decision.
8. Phase 8: Documentation, Examples, And Tests.

The error model is listed after wallet persistence because implementation will reveal the most important wallet failure cases, but it should be completed before transaction and account composables are finalized.

## Post-v1 Candidates

These features are useful, but they should not block v1 unless product scope changes:

- SPL token account helpers and token balance composables.
- Anchor provider and program helpers.
- A dedicated wallet modal or UI package.
- Nuxt server RPC utilities for server-side reads.
- Full desktop native wallet coverage if not included in v1.
- Additional iOS wallet providers such as Trust Wallet.
- Advanced program account indexing patterns.
- RPC provider failover and rate-limit handling.

## Tracking Rules

- Keep this roadmap current when implementing v1 feature work.
- Mark tasks complete in the same change set as the implementation.
- Move deliberately deferred work to the Post-v1 Candidates section instead of leaving it ambiguous.
- Add changesets for public package changes, but not for roadmap-only edits.
