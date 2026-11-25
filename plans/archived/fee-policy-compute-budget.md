# Fee/Compute-Budget Policy Plan (Phase 1)

**Archived:** Implementation and verification are complete on `plan/feature-queue-phase-1`. The release metadata is in `.changeset/fee-policy-compute-budget.md`; the phase record and measured baselines are in [`../feature-queue-phases.md`](../feature-queue-phases.md). No commit was made; all changes remain in the working tree.

Implement the first phase of the active feature queue: a local, explainable fee/compute-budget policy over existing Kit primitives. It lets an app choose and cap a compute budget without reimplementing Kit setters or guessing from simulation output. It is policy over Kit, not a new transport and not fee-market prediction.

Public surface:

- Core: `resolveFeePolicy()` and `FEE_POLICY_PRESETS` from `@vue-solana/core/fee-policy`, also re-exported from the core root barrel.
- Vue: `useComputeBudget()` and its discovery alias `useFeePolicy()` from `@vue-solana/vue/useComputeBudget`, also re-exported from the Vue root barrel.
- Nuxt: auto-import alias `useSolanaComputeBudget()`.
- Docs: the "Fee and compute budget policy" section in the transactions guide, mirrored into all six locale guides, plus package/knowledge-bundle references.

When a step is implemented, check its box. Keep checked sections as the implementation record.

## [x] Core Helper

- Create `packages/core/src/fee-policy.ts`.
- Add `FeePolicy`, `FeePolicyMode`, `FeeBudget`, `FeeBudgetCap`, `FeePolicySimulation`, `ResolveFeePolicyOptions`, and `ResolveFeePolicyResult<TMessage>` to `packages/core/src/types.ts` and re-export them from the subpath.
- Implement `resolveFeePolicy(message, policy?, options?)` with:
  - `mode`: `economy` (10% buffer, 0 µlamports), `standard` (20%, 10,000), `priority` (30%, 100,000).
  - `computeUnitBufferPercent`, optional explicit `microLamportsPerComputeUnit`, `maxMicroLamportsPerComputeUnit`, and `maxLamports`.
  - Optional `simulationResult.unitsConsumed`; otherwise a caller-supplied client is used only through Kit's `estimateResourceLimitsFactory()` and `rpc.simulateTransaction`.
  - A hard local compute-unit cap of 1,400,000 and a 5,000-lamport single-signature base-fee fallback when simulation does not provide a fee.
  - Explainable output: `computeUnitLimit`, `computeUnitPriceMicroLamports`, `priorityFeeLamports`, `baseFeeLamports`, `estimatedFeeLamports`, `capped`, `cappedBy`, `unitsConsumed`, and `source`.
- Apply Kit's version-aware setters: v1 messages receive total priority-fee lamports; legacy/v0 messages receive micro-lamports per compute unit.
- Validate the message and policy before doing RPC work. Reject prototype-key modes with `Object.hasOwn(FEE_POLICY_PRESETS, raw.mode)`.
- Throw `INVALID_INPUT` for malformed options, `MISSING_CLIENT_CAPABILITY` when estimation is requested without `rpc.simulateTransaction`, and normalize transport failures to `RPC_FAILURE`. Preserve abort reasons.
- Return a new message; never sign, send, or mutate the input transaction.
- Add `src/fee-policy` to `packages/core/build.config.ts`, add the exact `types`/`import` subpath to `packages/core/package.json`, and re-export the module from `packages/core/src/index.ts`.

## [x] Vue Composable

- Create `packages/vue/src/composables/useComputeBudget.ts` and the top-level `packages/vue/src/useComputeBudget.ts` re-export.
- Export both `useComputeBudget()` and `useFeePolicy()` from `packages/vue/src/index.ts`; add the subpath to `packages/vue/build.config.ts` and `packages/vue/package.json`.
- Signature: `useComputeBudget(messageSource, policySource?, options?)`, accepting ref/getter/value sources; a null message keeps the composable idle.
- Accept `options.simulationResult`, `options.immediate`, and `options.abortSignal`. Check `rpc.simulateTransaction` at setup only when no simulation source is supplied, failing with `MissingClientCapabilityError` and an actionable hint.
- Return `budget`, `message`, `status`, `error`, `loading`, `apply()`, `refresh()` (alias of `apply()`), and `reset()`.
- Build on `useExecution()` rather than `useAction`: source changes and explicit calls supersede in-flight work, `AbortController` composes with an optional external signal, stale results are ignored, and `onScopeDispose()` aborts active work.
- Keep SSR inert by default: resolve after mount when `immediate` is set, or only when an app explicitly calls `apply()`/`refresh()`.
- Never require a connected wallet or a `payer`.

## [x] Nuxt Alias

- Register `["useComputeBudget", "useSolanaComputeBudget"]` in `packages/nuxt/src/imports.ts`.
- Add the assertion to `packages/nuxt/src/module.imports.test.ts` and verify the generated import points at the built `useComputeBudget.mjs` file.
- Add `useSolanaComputeBudget` to the ESLint global list so example-app components can use the auto-import.
- Add no runtime config key, server route, wallet config, or payer handling.

## [x] English Docs And Knowledge Bundle

- Add `resolveFeePolicy()` and `@vue-solana/core/fee-policy` to `apps/docs/content/packages/core.md`.
- Add `useComputeBudget()`, `useFeePolicy()`, and `@vue-solana/vue/useComputeBudget` to `apps/docs/content/packages/vue.md`.
- Add `useSolanaComputeBudget()` to `apps/docs/content/packages/nuxt.md`.
- Add a "Fee and compute budget policy" section to `apps/docs/content/guides/transactions.md`, including a Vue example and a plain statement that values are estimates, not network guarantees, and that spend caps are enforced locally.
- Update the three `knowledge-bundle/packages/*.md` package references.
- Regenerate the tracked LLM surface with `pnpm --filter docs llms`; the English guide change updates `apps/docs/public/llms-full.txt`.

## [x] Locale Docs

- Mirror every English documentation change in `de`, `es`, `fr`, `ja`, `ko`, and `zh`.
- Keep heading levels, order, and code-fence counts identical to English; `packages/core/src/locale-docs.test.ts` passes for all 319 locale comparisons.
- Use proper accented French and Spanish, natural Japanese です・ます調, and keep identifiers and API names in Latin script.

## [x] Examples And E2E

- Add read-only `ComputeBudgetPanel` components to `examples/vue-vite` and `examples/nuxt`.
- Each panel simulates the existing demo memo transaction, feeds the simulation into `useComputeBudget()`, shows the chosen budget and updated message, and exposes `apply()`/`reset()` only. Neither panel signs or sends.
- Extend `e2e/example-apps.spec.ts` with a mocked-RPC spec that asserts the idle state, simulated result, computed limit/price/fee, updated displayed message, a `simulateTransaction` call, and no `sendTransaction` call. The spec skips in the real-devnet integration run.
- Do not add a runnable panel to `apps/docs` until the next release pin includes this API.

## [x] Tests

- Core unit tests: presets, explicit price, buffer math, simulation and RPC estimation, all three caps, capped reporting, legacy/v0 versus v1 setters, invalid message/policy values (including `"toString"` mode), missing capability, abort, and `RPC_FAILURE` normalization.
- Vue unit tests: setup-time capability check, reactive message/policy/simulation sources, `apply()`/`refresh()`/`reset()`, supersede-abort behavior, scope disposal, SSR-inert behavior, alias identity, and error surfacing.
- Nuxt tests: auto-import mapping and a real built entry.
- Export/build checks: entries match `exports`, ESM-only maps, externals preserved, buffer declaration shim intact, lean-import graph green, standalone packed installs typecheck.
- Locale/LLM checks: locale structure test, export-map doc test, docs LLM output test, and docs agent-surface smoke check all pass.

## [x] Release Metadata

- Add a changeset describing the new core helper, Vue composable/alias, and Nuxt auto-import as a minor release for all three packages.
- Confirm no new runtime dependency is introduced and no `exports` subpath is missing from the published maps.

## Acceptance Criteria

- A caller can resolve a capped compute budget from a Kit message through core or Vue without submitting a transaction.
- The result explains the chosen limit, price, priority/base/estimated fees, cap reasons, units source, and whether caps were applied.
- Malformed options produce `INVALID_INPUT`, a missing estimation method produces `MISSING_CLIENT_CAPABILITY`, and transport failures produce `RPC_FAILURE`.
- Reactive source changes and superseded calls never leak stale budgets into the UI, and scope disposal aborts active work.
- Nuxt apps can call `useSolanaComputeBudget()` without an explicit import.
- Every exported subpath is present in build config, package `exports`, docs lists, standalone-install smoke consumers, and ESLint globals where auto-imported in examples.
- Locale heading levels, order, and code-fence counts match English for every touched doc; the tracked LLM surface is regenerated.
- The change adds no new dependency, no wallet-protocol change, and no static heavy edge.

## Verification

```sh
pnpm format
pnpm lint
pnpm test
pnpm typecheck
pnpm build:packages
pnpm build:examples
pnpm --filter docs build
pnpm --filter docs typecheck
pnpm smoke:standalone-installs
pnpm smoke:docs-surface
pnpm check:entries
pnpm check:esm-map
pnpm check:externals
pnpm check:buffer-polyfill-declarations
pnpm size:packages
pnpm pack:size
pnpm test:e2e
```

All gates passed on `plan/feature-queue-phase-1`:

- `pnpm test`: 103 files / 1202 tests. `pnpm test:e2e`: 40 tests, including the new compute-budget spec in both example apps.
- `pnpm --filter docs build`: 398 prerendered routes, 0 link errors. The pre-existing large-client-chunk and schema-org import warnings remain unchanged.
- `pnpm check:entries`: 22 core / 46 Vue / 6 Nuxt entries. ESM-only, externals, and buffer declarations all pass. The standalone smoke consumers import `@vue-solana/core/fee-policy` and `@vue-solana/vue/useComputeBudget`.
- `pnpm size:packages`: core root 279.9 KB / 78.9 KB gzip, Vue root 381.5 KB / 114.5 KB gzip, Nuxt runtime plugin 192.5 KB / 60.1 KB gzip, Kit mirror 247.2 KB / 68.5 KB gzip. The report-only `@vue-solana/vue/useComputeBudget` entry is 68.3 KB / 21.3 KB. No new static heavy edge; the unchanged deferred iOS wallet debt is the only note.
- `pnpm pack:size`: core 29 files / 33,591 bytes, Vue 142 files / 75,606 bytes, Nuxt 16 files / 13,390 bytes, no `.d.mts` in any tarball.
- A parallel verification run briefly raced the standalone smoke test's package rebuild; the export, externals, and size checks were rerun sequentially against a fresh `pnpm build:packages` and passed.

## Out Of Scope

- No dynamic fee oracle, fee-market prediction, automatic priority-fee injection at send time, retry, resubmission, or durable nonce.
- No signing, sending, wallet UI, wallet/custody change, or `payer` handling.
- No fourth package, CSS contract, design tokens, icon set, or UI framework dependency.
- No Token-2022 work, program-client adapters, transaction diagnostics join, or portfolio reads; those belong to later phases.

## Decisions And Notes

- Presets are intentionally fixed. Phase 1 does not read a fee market.
- v1 messages use Kit's total-priority-fee-lamports setter; legacy/v0 messages use micro-lamports per compute unit. This keeps the policy correct across message versions without a custom serializer.
- Caps are enforced locally in `resolveFeePolicy()` and reported through `cappedBy`; they are not network guarantees.
- `useComputeBudget()` uses `useExecution()` with an explicit `AbortController`, because its work is RPC-backed estimation and needs both supersede and scope-disposal cancellation.
- The only build warnings are pre-existing: the empty `types` chunk and unbuild's "Potential missing package.json files" advisory from the batched declaration release build.
