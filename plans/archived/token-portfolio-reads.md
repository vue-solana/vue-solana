# Token Portfolio Reads Plan (Phase 3)

Implements Phase 3 of the active feature queue. Replace repeated `getTokenAccountsByOwner` + mint/decimals wiring with a reactive, read-only portfolio view. Mutations stay a separate later decision.

Public surface:

- Core: `getTokenPortfolio()` from `@vue-solana/core/token-portfolio`, plus `getTokenPortfolio2022()` from the opt-in `@vue-solana/core/token-portfolio-2022`.
- Vue: `useTokenPortfolio()` from `@vue-solana/vue/useTokenPortfolio`.
- Nuxt: auto-import alias `useSolanaTokenPortfolio()`.
- Docs: a "Token Portfolio" section in the account reads guide, linked from the core/Vue/Nuxt package docs and mirrored into all six locales.

Check a step when it is implemented; keep checked sections as the implementation record.

## [x] Core Helper

- Added `packages/core/src/token-portfolio.ts`: aggregates classic SPL accounts into `accounts`, `byMint`, `totals`, and `unresolvedMints`. Mint decimals use batched `getMultipleAccounts` reads (100 addresses per request) and fall back to the parsed account decimals when mint data is missing.
- Added `packages/core/src/token-portfolio-2022.ts`: same aggregation with the Token-2022 program filter. It is kept out of the root barrel and the eager import graph.
- Reused the strict `TokenAccountInfo` parser in `packages/core/src/token-accounts.ts`, exporting `TOKEN_PROGRAM_ADDRESS` / `TOKEN_2022_PROGRAM_ADDRESS` and forwarding `abortSignal`. No parsing was duplicated.
- Options are `commitment`, `abortSignal`, and `programId`. Missing `rpc.getMultipleAccounts` fails fast with `MISSING_CLIENT_CAPABILITY`; transport errors normalize to `RPC_FAILURE`; aborts rethrow the signal reason.

## [x] Vue/Nuxt Composable

- Added `useTokenPortfolio(owner, options?)` on top of `useRequest` with `items`, `byMint`, `totals`, `portfolio`, `status`, `loading`, `error`, and `refresh()`.
- Reactive owner watching; newer reads supersede older ones. Slot notifications invalidate the current view when the client supports them and `invalidateOnSlot` is not disabled.
- `includeToken2022` switches to the opt-in core helper through a dynamic import, so classic-only apps never load that path.
- Added the top-level Vue subpath re-export, root barrel export, Nuxt auto-import, and ESLint global.
- `useTokenBalance()` is unchanged.

## [x] Docs and Examples

- English plus de/es/fr/ja/ko/zh guides now document that portfolio lists are RPC-derived and read-only, not indexed, and that prices/metadata belong to the app.
- Package API lists, the knowledge bundle, and the generated LLM surface cover both core subpaths and both composable aliases.
- Both example apps mount `TokenPortfolioPanel` with mocked multiple accounts, two mints, a zero balance, and malformed account data. Token-2022 is covered by core unit tests, not the example panel.
- Playwright fixtures mock `getTokenAccountsByOwner` and `getMultipleAccounts`; the new spec runs on both apps, checks program/mint filters, and exercises `refresh()`.

## [x] Tests and Release Metadata

- Unit tests cover aggregation, decimal normalization, missing mint data, classic/Token-2022 separation, abort/supersede, invalid options, invalid owner, RPC error normalization, and the composable's reactive state.
- Added a changeset and updated `AGENTS.md`, `plans/feature-queue-phases.md`, and the standalone smoke matrix.
- Raised the core tarball budget from 50,000 to 55,000 bytes to keep deliberate headroom after the two new entries and their declarations moved the measured tarball from 49,989 to 52,214 bytes.

## Verification

Measured on `plan/feature-queue-phase-3`:

- `pnpm format`, `pnpm lint`, `pnpm test` (108 files / 1249 tests), and `pnpm typecheck`: green.
- `pnpm build:packages`, `pnpm build:examples`, `pnpm --filter docs typecheck`, and `pnpm --filter docs build`: green.
- `pnpm smoke:standalone-installs`: green, including both new core subpaths and the Vue/Nuxt composable alias. The first attempt hit a transient npm registry TLS error while fetching `ws`; a retry passed without code changes.
- `pnpm check:entries` (core 25 / Vue 48 / Nuxt 6), `pnpm check:esm-map`, `pnpm check:externals`, `pnpm check:buffer-polyfill-declarations`, and `pnpm size:packages`: green; no static heavy edge was introduced.
- `pnpm pack:size`: core 58 files / 52,214 bytes (under the new 55,000-byte budget), Vue 148 files / 79,145 bytes, Nuxt 16 files / 13,420 bytes, with no `.d.mts` in any tarball.
- `pnpm test:e2e`: 44 passed on both example apps, including the new portfolio fixture.
- Locale structure, docs export-map, and LLM-output guards passed inside `pnpm test`.

## Acceptance Criteria

- An owner's classic SPL accounts are returned grouped by mint with resolved decimals, UI amounts, totals, and unresolved-mint reporting.
- Token-2022 reads are opt-in and absent from the classic eager import graph.
- The Vue composable follows reactive owners, supports refresh and slot invalidation, and supersedes stale reads.
- Nuxt apps get `useSolanaTokenPortfolio()` as an auto-import.
- All verification gates are green, locale structure matches, and a changeset is present.

## Out Of Scope

- No transfer, mint, burn, or ATA creation.
- No fiat pricing or metadata indexing.
- No wallet custody change and no Token-2022 zk/confidential-transfer code in the default graph.
