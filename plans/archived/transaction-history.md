# Transaction History / Activity Feed Plan

**Archived:** Implementation and all checks are complete. The release metadata is in `.changeset/transaction-history.md`; kept for reference alongside the decision record in `reports/Next Vue Solana feature.md` and the user-facing [transactions guide](https://github.com/vue-solana/vue-solana/blob/main/apps/docs/content/guides/transactions.md).

Create the read-only transaction history API selected by the 2026-11-21 research report (`reports/Next Vue Solana feature.md`). It closes the simulate → sign/send → confirm → **inspect** loop without adding a dependency, custody obligation, indexer, or wallet/UI product.

Public surface:

- Core: `getTransactionHistory()` from `@vue-solana/core/transaction-history`, also exported from the core root barrel.
- Vue: `useTransactionHistory()` from `@vue-solana/vue/useTransactionHistory` and the root Vue barrel.
- Nuxt: auto-import alias `useSolanaTransactionHistory()`.

When a step is implemented, check its box. Keep checked sections as the implementation record.

## [x] Core Helper

- Create `packages/core/src/transaction-history.ts`.
- Add these shared types to `packages/core/src/types.ts` and re-export them from the subpath:
  - `TransactionHistoryOptions`: `before?`, `until?`, `limit?`, `commitment?`, `abortSignal?`.
  - `TransactionHistoryItem`: normalized `signature`, `slot`, `blockTime?`, `err`, `memo?`, `confirmationStatus?`.
  - `TransactionHistoryResult`: `items`, `hasMore`, `nextBefore?`.
- Implement `getTransactionHistory(client, address, options?)` as a thin pass-through to `client.rpc.getSignaturesForAddress(address, config).send({ abortSignal })`.
- Keep RPC results in newest-first order; do not sort or rewrite signatures.
- Derive `hasMore` from receiving a full page and set `nextBefore` to the last returned signature.
- Validate `limit` as an integer from 1 to 1000; throw `INVALID_INPUT` for bad values and `INVALID_ADDRESS` for an unresolvable address.
- Normalize transport/RPC failures with the existing `normalizeSolanaError(..., "RPC_FAILURE")` pattern.
- Add `src/transaction-history` to `packages/core/build.config.ts`, add the exact `types`/`import` subpath to `packages/core/package.json`, and re-export the module from `packages/core/src/index.ts`.
- Do not fetch parsed transactions, decode instructions, or add explorer presets.

## [x] Vue Composable

- Create `packages/vue/src/composables/useTransactionHistory.ts`.
- Add the top-level re-export `packages/vue/src/useTransactionHistory.ts` and export the composable from `packages/vue/src/index.ts`.
- Add the subpath to `packages/vue/build.config.ts` and `packages/vue/package.json`.
- Signature: `useTransactionHistory(addressSource, options?)`, accepting a ref/getter/value address source; `null`/`undefined` keeps the composable idle.
- Assert `rpc.getSignaturesForAddress` at setup time with `MissingClientCapabilityError`, following `useSimulateTransaction()`.
- Return:
  - `data: ShallowRef<TransactionHistoryResult | null>` as the canonical page result.
  - `items` and `hasMore` as computed aliases derived from `data`.
  - `error`, `loading`, `loadingMore`, `status`, `refresh()`, `loadMore()`, and `reset()`.
- `refresh()` loads page 1, supersedes and aborts an in-flight request, and replaces `data`.
- `loadMore()` appends a page using `data.value.nextBefore`; it is a no-op when `hasMore` is false or a load is already in progress.
- Watch the address source and materially changed options; a new source resets history and supersedes stale work.
- Abort in-flight work on `onScopeDispose()` and in `reset()`, and ignore stale responses.
- Do not require a connected wallet or a `payer`.

## [x] Nuxt Alias

- Register `["useTransactionHistory", "useSolanaTransactionHistory"]` in `packages/nuxt/src/imports.ts`.
- Verify the generated import points at the built `useTransactionHistory.mjs` file, not an ambient or missing path.
- Add no runtime config key, server route, wallet config, or payer handling.

## [x] Tests

- Core unit tests:
  - Exact RPC call arguments, including `before`, `until`, `limit`, `commitment`, and `abortSignal`.
  - Empty and full pages, `hasMore`, and `nextBefore`.
  - Normalization of all returned fields and preservation of newest-first order.
  - Invalid `limit`, invalid address, pre-aborted signal, and transport failure error codes.
  - No parsed-transaction or extra RPC calls.
- Vue unit tests:
  - Missing capability fails at setup with the expected hint.
  - Ref and getter address sources, including `null`/`undefined`.
  - `refresh()` supersedes and aborts the previous request.
  - `loadMore()` appends with the correct cursor and stops at `hasMore === false`.
  - Address changes reset state and ignore stale responses.
  - Scope disposal and `reset()` abort work.
- Nuxt tests:
  - Auto-import mapping exists and resolves to a real built file.
- E2E:
  - Replace the empty `getSignaturesForAddress` mock in `e2e/helpers.ts` with deterministic signatures.
  - Assert the activity panel's empty, first-page, and load-more states.
  - Keep integration-run assertions compatible with real devnet.

## [x] English Docs

- Add `getTransactionHistory()` to `apps/docs/content/packages/core.md`.
- Add `useTransactionHistory()` and its subpath to `apps/docs/content/packages/vue.md`.
- Add `useSolanaTransactionHistory()` to `apps/docs/content/packages/nuxt.md`.
- Add a “Transaction History” section to `apps/docs/content/guides/transactions.md`, showing a first page and `loadMore()`.
- Update the three `knowledge-bundle/packages/*.md` package references.
- Regenerate the tracked LLM surface with `pnpm --filter docs llms`.

## [x] Locale Docs

- Mirror the English documentation changes in `de`, `es`, `fr`, `ja`, `ko`, and `zh`.
- Keep heading levels, order, and code-fence counts identical to English; do not create new locale files.
- Use proper accented French and Spanish, and keep internal links locale-prefixed where required.

## [x] Examples And E2E

- Add a small read-only activity panel to `examples/vue-vite` and `examples/nuxt`.
- Use the connected wallet address when available and a placeholder address otherwise.
- Provide manual refresh and load-more controls only; no polling or automatic retries.
- Do not add a runnable panel to `apps/docs` until the next release pin includes this API.

## [x] Release Metadata

- Add a changeset describing the new core helper, Vue composable, and Nuxt auto-import as a minor release for all three packages.
- Confirm no new runtime dependency is introduced and no `exports` subpath is missing from the published maps.

## Acceptance Criteria

- A caller can list signature metadata for an address through core or Vue without submitting a transaction or fetching full parsed transactions.
- Results expose `signature`, `slot`, `blockTime?`, `err`, `memo?`, and `confirmationStatus?` in Kit-native form.
- Pagination works with `before`/`until` and a derived `nextBefore`; a full page means `hasMore` is true.
- Malformed options produce `INVALID_INPUT`, bad addresses produce `INVALID_ADDRESS`, network failures produce `RPC_FAILURE`, and a missing Vue RPC method fails at setup with `MissingClientCapabilityError`.
- Reactive address changes and superseded calls never leak stale data into the UI.
- Nuxt apps can call `useSolanaTransactionHistory()` without an explicit import.
- Every exported subpath is present in the build config, package `exports`, docs lists, and standalone-install smoke tests.
- Locale heading levels, order, and code-fence counts match English for every touched doc.
- The change adds no new dependency, no wallet-protocol change, no static heavy edge, and no secret into Nuxt public config.

## Verification

```sh
pnpm format
pnpm lint
pnpm test
pnpm typecheck
pnpm build:packages
pnpm build:examples
pnpm --filter docs build
pnpm check:entries
pnpm check:esm-map
pnpm check:externals
pnpm check:buffer-polyfill-declarations
pnpm size:packages
pnpm pack:size
pnpm smoke:standalone-installs
pnpm smoke:docs-surface
pnpm test:e2e
```

## Out Of Scope

- No parsed transaction bodies, instruction decoding, token-transfer categorization, memo parsing, or human-readable program labels.
- No indexing database, server persistence, webhook, or explorer-specific link builder.
- No retry-on-timeout, transaction replacement, auto-resubmission, durable nonce, or priority-fee automation.
- No wallet modal, activity-feed component, Anchor/IDL helpers, Token-2022 actions, or RPC failover.
- No replacement of the existing wallet, MWA, iOS, signer, or Nuxt SSR architecture.
- No new npm dependency and no change to the full `@solana/kit` mirror subpaths.
