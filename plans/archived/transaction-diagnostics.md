# Transaction Diagnostics Join Plan (Phase 2)

Implements Phase 2 of the active feature queue. Give apps one explainable object for "why did this transaction fail?" by joining data that already exists, without turning the library into an instruction decoder.

Public surface:

- Core: `buildDiagnosticReport()` / `createTransactionDiagnostics()` from `@vue-solana/core/diagnostics`.
- Vue: `useTransactionDiagnostics()` from `@vue-solana/vue/useTransactionDiagnostics`.
- Nuxt: auto-import alias `useSolanaTransactionDiagnostics()`.
- Docs: a "Diagnosing a failed transaction" section in the errors guide, linked from the transactions guide, mirrored into all six locales.

Check a step when it is implemented; keep checked sections as the implementation record.

## [x] Core Helper

- Add `packages/core/src/diagnostics.ts` and the report/input types in `packages/core/src/types.ts`.
- Join a history item, a simulation result, a normalized `SolanaError`, and an optional Phase 1 fee budget into stable fields: `summary`, `code`, `logs`, `balanceChanges`, `unitsConsumed`, `feeBudget`, and `suggestions`.
- Keep the builder pure and RPC-free; map only known `SolanaError` codes and raw RPC error shapes.
- Accept an app-supplied program label map; ship no built-in program registry.
- Reject malformed inputs with `INVALID_INPUT`.
- Add the subpath to `packages/core/build.config.ts`, `packages/core/package.json`, and the core root barrel.

## [x] Vue Composable

- Add `packages/vue/src/composables/useTransactionDiagnostics.ts` and the top-level `packages/vue/src/useTransactionDiagnostics.ts` re-export.
- Reactive signature/history item, simulation result, error, and fee-budget sources; expose `report`, `status`, `error`, and `refresh()`.
- Add the subpath to `packages/vue/build.config.ts` and `packages/vue/package.json`, plus the Vue root barrel.
- Keep the composable RPC-free, SSR-inert by default, and safe with partial/empty inputs.

## [x] Nuxt Alias

- Register `useSolanaTransactionDiagnostics()` in `packages/nuxt/src/imports.ts`.
- Extend the auto-import assertions and ESLint globals.

## [x] Docs And Knowledge Bundle

- English errors guide section plus a link from the transactions guide; mirror both into `de/es/fr/ja/ko/zh`.
- Update package references in docs and the knowledge bundle; regenerate the tracked LLM surface.

## [x] Examples And E2E

- Read-only diagnostic panel in `examples/vue-vite` and `examples/nuxt` that starts from a failed history item and renders the joined report beside the normalized error card.
- E2E mock fixture with a failed simulation and a history `err`.

## [x] Tests

- Core unit tests for every input combination, unknown-code passthrough, app-supplied labels, and empty/partial data.
- Vue unit tests for reactive sources, `refresh()`, supersede, and SSR behavior.
- Nuxt auto-import, export-map, ESM-map, externals, lean-import, and standalone-install checks.

## [x] Release Metadata And Handoff

- Changeset, `AGENTS.md`, phase status, and archived implementation record.

## Verification

Measured on `plan/feature-queue-phase-2`; no commit was made before this handoff.

- `pnpm format`, `pnpm lint`, `pnpm test` (105 files / 1223 tests), and `pnpm typecheck`: green.
- `pnpm build:examples`, `pnpm --filter docs build`, and `pnpm smoke:standalone-installs`: green.
- `pnpm check:entries`, `pnpm check:esm-map`, `pnpm check:externals`, `pnpm check:buffer-polyfill-declarations`, and `pnpm size:packages`: green.
- `pnpm pack:size`: core 54 files / 49,989 bytes, Vue 145 files / 77,374 bytes, Nuxt 16 files / 13,404 bytes, with no `.d.mts` in any tarball. The core budget is intentionally tight; the diagnostics entry has no new dependency.

  The diagnostics messages were shortened during implementation to keep the core tarball under the existing 50,000-byte budget. Keep that budget in mind when extending the report or its suggestion strings.

- `pnpm test:e2e`: 42 passed, including the failed simulation/history `err` diagnostics assertions on both example apps.
- Locale structure, docs export-map, and LLM-output guards passed inside `pnpm test`.

## Acceptance Criteria

- A caller can explain a failed transaction from already-available data without RPC calls, instruction decoding, token categorization, memo interpretation, explorer links, auto-retry, or persistence.
- Known codes and raw RPC shapes produce stable suggestions; unknown codes pass through unchanged.
- Program labels are app-supplied only; no built-in registry is shipped.
- Malformed options produce `INVALID_INPUT`.
- Nuxt apps get `useSolanaTransactionDiagnostics()` as an auto-import.
- All verification gates are green, locale structure matches, and a changeset is present.

## Out Of Scope

- No instruction decoding, token-transfer categorization, memo interpretation, explorer URL presets, auto-retry, or server-side persistence.
- No new dependency, no wallet-protocol change, and no static heavy edge.
