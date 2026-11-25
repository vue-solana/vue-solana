# Feature Queue Phases

Status: Phases 0–1 complete on `plan/feature-queue-phase-0` and `plan/feature-queue-phase-1`; Phases 2–6 proposed. Owner: TBD.

This plan turns the stronger feature queue from [`reports/Vue Solana UI library.md`](../reports/Vue%20Solana%20UI%20library.md) into shippable slices. It supersedes the priority order currently written in `apps/docs/content/roadmap.md`; Phase 0 updates that roadmap and every locale mirror.

The queue is: fee/compute-budget policy, diagnostics joining history + simulation + errors, token/portfolio reads, program-client reactivity, and bundle/SSR polish. A UI package is explicitly **not** in this plan; Phase 6 is only an evidence gate for deciding later.

## Sequencing principles

- Ship thin, reversible slices in the existing cross-layer shape: core helper, Vue composable, top-level Vue subpath re-export, Nuxt auto-import, docs section, example panel, tests, changeset.
- Prefer read-only work. Mutations, retries, resubmission, custodial behavior, and program catalogs stay out until a dedicated decision.
- Do not add a fourth package, CSS contract, design tokens, icon set, or React/Wallet Standard UI dependency.
- Keep the single-`@solana/kit` copy, ESM-only exports, `sideEffects: false`, lean eager graphs, SSR-safe Nuxt boundaries, and published-docs pin policy intact.
- Use workspace examples for unreleased code. `apps/docs` imports the pinned published version, so its demo code can only use a new API after the post-publish pin bump. Markdown prose may land earlier.
- Every docs section must be mirrored into `de/es/fr/ja/ko/zh` with identical heading levels, order, and code-fence counts. Regenerate the tracked LLM surface only when English content actually changes.
- Complete phases in order where dependencies exist. Bundle/SSR polish is a parallel track that starts after Phase 0 and reports at every phase boundary.
- When a phase ships, update `AGENTS.md` and move the corresponding completed record to `plans/archived/` using `plans/archived/transaction-history.md` as the template.

## Phase map

| Phase | Theme                        | Size | Depends on | Result                                                         |
| ----- | ---------------------------- | ---- | ---------- | -------------------------------------------------------------- |
| 0     | Roadmap and guardrails       | S    | none       | Updated roadmap, recorded baselines, shared definition of done |
| 1     | Fee/compute-budget policy    | M    | 0          | Core policy helper, Vue/Nuxt composables, docs, examples       |
| 2     | Transaction diagnostics join | M    | 1          | Core diagnostic report builder, Vue/Nuxt composable, docs      |
| 3     | Token/portfolio reads        | M/L  | 2          | Reactive portfolio reads, classic first, Token-2022 opt-in     |
| 4     | Program-client reactivity    | L    | 3          | Generic reactive adapters around Codama-generated clients      |
| 5     | Bundle and SSR polish        | L    | 0, ongoing | Smaller Vue eager chunk, verified SSR boundaries, size guard   |
| 6     | UI evidence gate             | S    | 1–5        | Decision to keep recipes or open a separate UI plan            |

## Phase 0 — Roadmap and guardrails

Goal: make the queue the single source of truth and record the numbers that later phases must not regress.

- [x] Replace the priority table in `apps/docs/content/roadmap.md` with this queue. Mark simulation, SSR server RPC, and transaction history as shipped; keep wallet modal/UI, Anchor, RPC failover, versioned docs, and desktop native work under "Later" with links to their existing plans/reports.
- [x] Mirror the roadmap change into `apps/docs/content/locales/{de,es,fr,ja,ko,zh}/roadmap.md`. Keep heading structure and code-fence counts identical; run `pnpm test` to prove the locale-docs gate passes.
- [x] Regenerate the tracked LLM surface with `pnpm --filter docs llms` because the English roadmap changed. No commit was made in Phase 0; the generated output remains in the working tree with the other branch changes.
- [x] Record baseline output from `pnpm size:packages`, `pnpm pack:size`, and `pnpm build:packages` in this file. Note the current Vue eager chunk and any `IOS_DEBT_*` exemptions from `scripts/check-lean-imports.mjs`.
- [x] Add this plan's link to `AGENTS.md` under plans/handoff notes so the next agent sees the active queue.
- [x] Confirm no forbidden dependency is needed for Phases 1–4. TanStack Query and any UI framework stay outside the committed scope.

Exit criteria: roadmap and locales updated, baselines recorded, all CI gates listed at the bottom green, no dependency-policy exception opened.

### Phase 0 baselines

Measured on `plan/feature-queue-phase-0` after `pnpm build:packages`:

- `pnpm build:packages`: green. The pre-existing "Generated an empty chunk: `types`" warning remains; declaration batching is unchanged.
- `pnpm size:packages`: green. Root entries are `@vue-solana/core` 276.4 KB minified / 77.8 KB gzip, `@vue-solana/vue` 376.7 KB / 113.2 KB, and `@vue-solana/nuxt` runtime plugin 192.5 KB / 60.1 KB. The Kit mirror is 247.2 KB / 68.5 KB for both core and vue.
- iOS debt note: `scripts/check-lean-imports.mjs` reports 23,136 bytes of built ESM in the eager Vue graph plus `tweetnacl`. The only exemption is `IOS_DEBT_ENTRIES = new Set(["index.mjs"])` for specifiers `@vue-solana/core/ios-wallet` and `tweetnacl`; Phase 5 must remove it rather than move the weight to another eager entry.
- `pnpm pack:size`: green. Core 50 files / 43,802 bytes (budget 50,000), Vue 139 files / 73,500 bytes (budget 80,000), Nuxt 16 files / 13,374 bytes (budget 20,000), with no `.d.mts` in any tarball.
- Dependency policy: no new dependency is needed for Phases 1–4; TanStack Query and UI frameworks are explicit non-goals.
- Phase 0 verification: `pnpm format`, `pnpm lint`, `pnpm test` (101 files / 1180 tests), `pnpm typecheck`, `pnpm build:packages`, `pnpm build:examples`, `pnpm --filter docs build`, `pnpm --filter docs typecheck`, `pnpm smoke:standalone-installs`, `pnpm check:entries`, `pnpm check:esm-map`, `pnpm check:externals`, `pnpm check:buffer-polyfill-declarations`, `pnpm size:packages`, `pnpm pack:size`, and `pnpm test:e2e` (38 tests) all passed. The export checks were rerun sequentially after a parallel verification run briefly raced the package rebuild.

## Phase 1 — Fee/compute-budget policy

Goal: let an app choose and cap a compute budget without reimplementing Kit setters or guessing from simulation output. This is policy over existing Kit primitives, not a new transport.

Working API names may change during implementation; the boundaries are fixed.

- [x] Core: add `@vue-solana/core/fee-policy` exporting `resolveFeePolicy()` plus `FeePolicy`, `FeeBudget`, and result types. Inputs: a message, a policy (`mode: "economy" | "standard" | "priority"`, `maxLamports`, `maxMicroLamportsPerComputeUnit`, `computeUnitBufferPercent`), and an optional simulation result from `simulateTransaction()`. Output: a modified message and a report with `computeUnitLimit`, `computeUnitPriceMicroLamports`, `estimatedFeeLamports`, and `capped`.
- [x] Keep it pure of signing and sending. Require the caller's client only for optional estimation; throw `MISSING_CLIENT_CAPABILITY` when the estimation method is absent, `INVALID_INPUT` for malformed policy values, and `RPC_FAILURE` for transport failures.
- [x] Vue: add `useComputeBudget()` (alias `useFeePolicy()` if both names aid discovery) built on the shared action store. It watches reactive message/policy sources, exposes `budget`, `status`, `error`, `apply()`, and `refresh()`, and supersedes in-flight work on scope dispose.
- [x] Add the top-level `src/useComputeBudget.ts` re-export and register `useSolanaComputeBudget()` in `packages/nuxt/src/imports.ts`.
- [x] Docs: add a "Fee and compute budget policy" section to the English transactions guide and mirror it into all six locales. State plainly that values are estimates, not guarantees, and that spend caps are enforced locally.
- [x] Examples: add a read-only panel in `examples/vue-vite` and `examples/nuxt` that takes simulation output, shows the chosen budget, and applies it to a displayed message. Do not send.
- [x] Tests: unit coverage for presets, caps, buffer math, invalid options, missing capability, abort/supersede, and RPC normalization; extend the e2e RPC mock with simulation and message-update assertions.
- [x] Add a changeset and update `AGENTS.md`.

Explicit non-goals: no dynamic fee oracle, no automatic priority-fee injection at send time, no retry/resubmission, no durable nonce, no wallet UI, no fee market prediction.

Exit criteria: all CI gates green, `pnpm size:packages` shows no new static heavy edge, docs/locales/LLM surface consistent, changeset present.

### Phase 1 verification

Measured on `plan/feature-queue-phase-1`; no commit was made.

- `pnpm format`, `pnpm lint`, `pnpm test` (103 files / 1202 tests), `pnpm typecheck`, `pnpm build:packages`, `pnpm build:examples`, `pnpm --filter docs build` (398 prerendered routes, 0 link errors), `pnpm --filter docs typecheck`, `pnpm smoke:standalone-installs`, `pnpm smoke:docs-surface`, `pnpm check:entries`, `pnpm check:esm-map`, `pnpm check:externals`, `pnpm check:buffer-polyfill-declarations`, `pnpm size:packages`, `pnpm pack:size`, and `pnpm test:e2e` (40 tests) all passed.
- Export-map checks cover 22 core, 46 Vue, and 6 Nuxt entries. The standalone smoke consumers now import `@vue-solana/core/fee-policy` and `@vue-solana/vue/useComputeBudget`; all three packages install and typecheck from packed tarballs.
- `pnpm size:packages`: root entries are `@vue-solana/core` 279.9 KB minified / 78.9 KB gzip, `@vue-solana/vue` 381.5 KB / 114.5 KB, and `@vue-solana/nuxt` runtime plugin 192.5 KB / 60.1 KB. The Kit mirror remains 247.2 KB / 68.5 KB. The new `@vue-solana/vue/useComputeBudget` report-only entry is 68.3 KB / 21.3 KB, and the lean-import gate reports no new static heavy edge; the only note is the unchanged deferred iOS wallet debt.
- `pnpm pack:size`: core 29 files / 33,591 bytes, Vue 142 files / 75,606 bytes, Nuxt 16 files / 13,390 bytes, with no `.d.mts` in any tarball.
- The export, externals, and size checks were rerun sequentially after a parallel run briefly raced the standalone smoke test's package rebuild, matching the workflow note in `AGENTS.md`.
- The implementation record is archived at [`plans/archived/fee-policy-compute-budget.md`](archived/fee-policy-compute-budget.md).

## Phase 2 — Transaction diagnostics join

Goal: give apps one explainable object for "why did this transaction fail?" using data that already exists, without turning the library into an instruction decoder.

- [ ] Core: add `@vue-solana/core/diagnostics` with `buildDiagnosticReport()`/`createTransactionDiagnostics()`. It joins a `getTransactionHistory()` item, a `simulateTransaction()` result, a normalized `SolanaError`, and an optional Phase 1 fee budget into stable fields: `summary`, `code`, `logs`, `balanceChanges`, `unitsConsumed`, `feeBudget`, and `suggestions`.
- [ ] Keep the builder pure and RPC-free. Map only known `SolanaError` codes and raw RPC error shapes. Allow an app-supplied label map for program addresses, but ship no built-in program registry.
- [ ] Vue: add `useTransactionDiagnostics()` with reactive inputs for signature/history item, simulation result, and error; expose `report`, `status`, and `refresh()`. Nuxt alias: `useSolanaTransactionDiagnostics()`.
- [ ] Docs: add a "Diagnosing a failed transaction" section to the errors guide, link it from the transactions guide, and mirror both changes into all six locales.
- [ ] Examples: add a panel that starts from a failed history item, runs the existing simulation mock, and renders the joined report beside the normalized error card.
- [ ] Tests: unit tests for each input combination, unknown-code passthrough, app-supplied labels, and empty/partial data; e2e fixture with a failed simulation and a history `err`.
- [ ] Add a changeset and update `AGENTS.md`.

Explicit non-goals: no instruction decoding, no token-transfer categorization, no memo interpretation, no explorer URL presets, no auto-retry, no server-side persistence.

Exit criteria: all CI gates green, diagnostics remain dependency-free and lean, locale structure test passes, changeset present.

## Phase 3 — Token/portfolio reads

Goal: replace repeated `getTokenAccountsByOwner` + mint/decimals wiring with a reactive, read-only portfolio view. Mutations are a separate later decision.

- [ ] Core 3a: add `@vue-solana/core/token-portfolio` with `getTokenPortfolio()`. Aggregate classic SPL accounts for an owner, resolve mint decimals where available, and return normalized `accounts`, `byMint`, and `totals`, plus `abortSignal` and `commitment` options. Reuse `packages/core/src/token-accounts.ts`; do not duplicate parsing.
- [ ] Core 3b: add a separate opt-in `@vue-solana/core/token-portfolio-2022` subpath for Token-2022 accounts. Keep extension/zk-heavy code lazy behind that subpath so the classic entry stays lean.
- [ ] Vue: add `useTokenPortfolio(ownerSource, options?)` with reactive owner watching, `items`, `loading`, `error`, `refresh()`, and subscription-driven invalidation where the client supports it. Keep `useTokenBalance()` unchanged. Nuxt alias: `useSolanaTokenPortfolio()`.
- [ ] Docs: add a "Token portfolio" section to the tokens guide and mirror it into all six locales. Document that account lists are RPC-derived, not indexed, and that prices/metadata are the app's job.
- [ ] Examples: add a portfolio panel to both example apps with mocked multiple accounts, zero balances, and parse failures.
- [ ] Tests: unit coverage for aggregation, decimal normalization, missing mint data, classic/Token-2022 separation, abort/supersede, and RPC error normalization; e2e mocks for `getTokenAccountsByOwner` and `getAccountInfo`.
- [ ] Add a changeset and update `AGENTS.md`.

Explicit non-goals: no transfer/mint/burn/ATA creation, no fiat pricing, no metadata indexing, no wallet custody changes, no Token-2022 zk code in the default graph.

Exit criteria: all CI gates green, lean-import gate still forbids static heavy edges, docs/locales consistent, changeset present.

## Phase 4 — Program-client reactivity

Goal: make Codama-generated clients pleasant in Vue without generating code or cataloging programs.

- [ ] Core: add `@vue-solana/core/program-client` with generic helpers that accept a codec and address from a generated client: decoded account fetch/subscribe helpers returning typed data plus slot/address metadata, with `abortSignal`, `commitment`, and the existing error-code policy.
- [ ] Vue: add `useProgramAccount()`, `useProgramEvents()`, and `useProgramInstruction()` (names provisional). They take reactive addresses/args and a generated client namespace, expose `data`, `status`, `error`, `refresh()`, and an explicit `send()` for instruction calls, and track pending/confirmed state. No automatic send.
- [ ] Add top-level Vue subpath re-exports and Nuxt aliases for all three composables.
- [ ] Docs: add a "Generated program clients" guide section showing reactive inputs, refresh, and pending/confirmed state. Use a local codec in the runnable example so no new generated-client dependency is forced on consumers; mirror the section into all six locales.
- [ ] Tests: unit tests with fake codecs and client namespaces, subscription cleanup, stale-input supersede, and error normalization; e2e coverage through the existing subscription mock.
- [ ] Add a changeset and update `AGENTS.md`.

Explicit non-goals: no IDL parsing, no codegen, no program registry, no Anchor provider, no auto-submit, no wallet/payer redesign.

Exit criteria: all CI gates green, no new program-specific dependency in core/vue, docs/locales consistent, changeset present.

## Phase 5 — Bundle and SSR polish

This is a parallel track. Start it after Phase 0 and report at every phase boundary; do not let it block Phases 1–4.

- [ ] Execute the iOS wallet lazy-loading work in `plans/deferred/bundle-performance-followups.md`: WebCrypto request ids, dynamic imports inside adapter async methods, a crypto-free `ios-wallet-discovery` entry, gated deep-link intake, and removal of the `IOS_DEBT_*` exemptions.
- [ ] Verify the measured eager-chunk reduction against the Phase 0 baseline. `pnpm size:packages` must stay green and the report must show the debt removed rather than moved into another eager entry.
- [ ] Audit every composable added in Phases 1–4 for SSR behavior. Browser-only work must stay behind client lifecycle boundaries and have `ssr-inert`-style tests like the existing suite.
- [ ] Finish the Nuxt server RPC documentation referenced in `apps/docs/content/roadmap.md` and add SSR examples for the new read-only composables. Do not move `payer`, `payerSecretKey`, or `wallet` into public runtime config.
- [ ] Keep the lean-import graph and pack-size budgets green. Do not add new budgets without a measurement; the Nuxt runtime report remains report-only as documented.
- [ ] Optional decision, not committed: evaluate a TanStack Query adapter only after at least two apps duplicate the same cache/refresh wiring. Adding the dependency requires its own plan and a fresh export-map/smoke-matrix pass.

Exit criteria: measured eager-chunk improvement, no static heavy edges, SSR tests green, docs updated, all CI gates green.

## Phase 6 — UI evidence gate

No UI implementation is committed here. This phase records whether the earlier "recipes, not a library" decision still holds.

- [ ] Add a lightweight docs feedback path for UI recipe requests so demand can be measured; the repository currently has zero issues and Discussions disabled.
- [ ] Keep the copyable recipes in the wallets/transactions guides as the default answer: connect button, wallet list, account chip, transaction status badge, and read-only activity list.
- [ ] Trigger a separate UI plan only if there are three unsolicited requests for the same component, or two independent apps—one external—maintaining materially identical DOM/CSS/interaction markup, the underlying composables have been stable for one release, and a named owner accepts keyboard/focus, theming, translated strings, and real Android/iOS/desktop validation.
- [ ] If triggered, scope the first package as opt-in, unstyled, slot-driven `@vue-solana/ui@0.x`: `ActivityList` first, `WalletConnect` second, wallet picker last. Exclude CSS files, tokens, icons, modal portals, focus traps, toast queues, QR camera components, token inputs, and mobile-handoff guarantees.
- [ ] Record the decision here and either open a dedicated UI plan or close the question for this cycle.

Exit criterion: a written decision with evidence, not an implementation assumption.

## Verification gates for every phase

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
pnpm check:entries
pnpm check:esm-map
pnpm check:externals
pnpm check:buffer-polyfill-declarations
pnpm size:packages
pnpm pack:size
pnpm test:e2e
```

`pnpm --filter docs build` and `pnpm --filter docs typecheck` only prove new APIs after the docs pin is bumped following a publish. Before that, prove unreleased code through `packages/*` tests and the two example apps.

## Definition of done checklist

- [ ] Exact `types`/`import` export subpaths, ESM-only, no `.d.mts` in tarballs, no root-barrel re-export of heavy paths.
- [ ] No forbidden dependency, no second `@solana/kit` copy, no new static heavy edge in `pnpm size:packages`.
- [ ] Core helper + Vue composable + top-level Vue subpath re-export + Nuxt auto-import all present and covered by export/import checks.
- [ ] Error codes follow the existing policy: malformed options are `INVALID_INPUT`, transport failures are `RPC_FAILURE`, missing client methods are `MISSING_CLIENT_CAPABILITY`.
- [ ] Unit tests, e2e mock coverage, both example panels, English docs section, six locale mirrors, and regenerated LLM surface where applicable.
- [ ] Changeset added; `AGENTS.md` updated; completed phase record archived under `plans/archived/`.
