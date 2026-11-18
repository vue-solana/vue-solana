# Transaction Simulation Helpers Plan

Track implementation of the roadmap item “Transaction Simulation Helpers”: let apps preview a transaction’s outcome before submission without spending SOL.

Public surface:

- Core: `simulateTransaction(client, transaction, options?)` from `@vue-solana/core/transaction`.
- Vue: `useSimulateTransaction()` from `@vue-solana/vue/useSimulateTransaction` and the root Vue barrel.
- Nuxt: auto-import alias `useSolanaSimulateTransaction()`.

When a step is implemented, strike it through. When every step under a feature is done, leave only the checked feature title.

## [x] Core Helper

## [x] Vue Composable

## [x] Nuxt Alias

## [x] Tests

## [x] English Docs

## [x] Locale Docs

## [x] Release Metadata

## Acceptance Criteria

- A caller can simulate raw wire transaction bytes through core or a Vue component and receive normalized `err`, logs, lamport/token balance changes, and loaded addresses without submitting a transaction.
- A failed simulation (`err` non-null) is inspectable data; only transport/configuration problems reject.
- Error codes follow the existing policy: `INVALID_INPUT` for malformed options/bytes, `MISSING_CLIENT_CAPABILITY` at Vue setup for a broken client, and `RPC_FAILURE` for network failures.
- Nuxt apps can call `useSolanaSimulateTransaction()` without an explicit import.
- Every exported subpath is present in the build config, package `exports`, and docs lists.
- Locale heading levels, order, and code fence counts match English for every touched doc.

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
pnpm size:packages
pnpm smoke:standalone-installs
```

Run `pnpm test:e2e` as well if an example panel is added; it is not required for the core/Vue/Nuxt/docs-only first slice.

## Out Of Scope

- No wallet-modal UI, example-app panel, or e2e flow in the first slice. The existing `simulateTransaction` mock in `e2e/helpers.ts` already covers the transport shape if a later change adds one.
- No transaction planning/sending changes and no client `payer` requirement.
- No `accounts` account-info request, inner-instruction decoding, compute-budget estimator, or RPC failover.
- No fallback implementation outside `@solana/kit`, no new package, and no change to the full `@solana/kit` mirror subpaths.
- The docs app is pinned to the published package version, so do not add a runnable `/demo` panel that imports the new API until after the next release pin update.
