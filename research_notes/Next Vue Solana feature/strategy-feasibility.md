# Next Vue Solana feature: strategic feasibility assessment

## What hard constraints must a next feature satisfy?

### Takeaway

A next feature must be Kit-native, ESM-only, subpath-friendly, SSR-safe, and deliberately small in the eager bundle; it must not add a second Kit copy, touch Nuxt secret boundaries, or force changes to browser/mobile wallet behavior. The safest shape is a read/action composable built from existing Kit RPC capabilities, with a core helper, a Vue composable, a Nuxt auto-import alias, docs/examples, and mockable tests.

### Cited Findings

- All three packages are `"type": "module"`, expose only `import` conditions in `exports`, and set `"sideEffects": false`; there is no CommonJS `require` path to preserve — [core package.json, lines 23–43](https://github.com/vue-solana/vue-solana/blob/main/packages/core/package.json), [vue package.json, lines 23–31](https://github.com/vue-solana/vue-solana/blob/main/packages/vue/package.json), [nuxt package.json, lines 22–43](https://github.com/vue-solana/vue-solana/blob/main/packages/nuxt/package.json).
- Published tarballs exclude `.d.mts`, and `exports` maps are checked by dedicated scripts; new subpaths therefore need matching `types`/`import` entries, declaration output, export-map checks, and standalone-install smoke coverage — [core package.json, lines 109–122](https://github.com/vue-solana/vue-solana/blob/main/packages/core/package.json), [root package.json, lines 35–42](https://github.com/vue-solana/vue-solana/blob/main/package.json), [README, lines 189–190](https://github.com/vue-solana/vue-solana/blob/main/README.md).
- Kit is deliberately mirrored from `@solana/kit` in each `/kit` subpath, and the workspace pins `@solana/kit` to `^8.6.0` because duplicate Kit copies produce duplicate `SolanaError` classes and break `isSolanaError()` — [core index.ts, lines 36–50](https://github.com/vue-solana/vue-solana/blob/main/packages/core/src/index.ts), [pnpm-workspace.yaml, lines 23–38](https://github.com/vue-solana/vue-solana/blob/main/pnpm-workspace.yaml).
- Core’s root barrel intentionally excludes `buffer-polyfill`, `ios-wallet`, and `mobile-wallet` because they pull in Buffer, tweetnacl, and the mobile-wallet protocol graph; heavy features must stay behind documented subpaths — [core index.ts, lines 17–34](https://github.com/vue-solana/vue-solana/blob/main/packages/core/src/index.ts).
- `scripts/check-lean-imports.mjs` fails when any Vue entry statically reaches Android wallet code, Buffer, `qrcode`, or `jsqr`, and walks the built ESM graph rather than trusting source greps; iOS/tweetnacl reachability is tracked debt allowed only from the root entry — [check-lean-imports.mjs, lines 46–86](https://github.com/vue-solana/vue-solana/blob/main/scripts/check-lean-imports.mjs), [check-lean-imports.mjs, lines 208–255](https://github.com/vue-solana/vue-solana/blob/main/scripts/check-lean-imports.mjs).
- Vue composables establish the expected reactivity pattern: `shallowRef` state, `onScopeDispose()` aborting in-flight work, and explicit capability errors for missing client methods — [useSimulateTransaction.ts, lines 46–89](https://github.com/vue-solana/vue-solana/blob/main/packages/vue/src/composables/useSimulateTransaction.ts), [useClientCapability.ts](https://github.com/vue-solana/vue-solana/blob/main/packages/vue/src/composables/useClientCapability.ts).
- Nuxt auto-imports must be registered by exact name in `packages/nuxt/src/imports.ts`, and their `from` paths must resolve to real built files or generated `.d.ts` files silently degrade composables to `any` — [imports.ts, lines 1–44](https://github.com/vue-solana/vue-solana/blob/main/packages/nuxt/src/imports.ts), [imports.ts, lines 73–99](https://github.com/vue-solana/vue-solana/blob/main/packages/nuxt/src/imports.ts).
- Nuxt forbids `wallet`, `payer`, and `payerSecretKey` in module options and public runtime config; server-side RPC config lives under private `runtimeConfig.solanaServer`, and `createServerSolanaClient()` strips signer fields at runtime — [module.ts, lines 42–50](https://github.com/vue-solana/vue-solana/blob/main/packages/nuxt/src/module.ts), [module.ts, lines 94–105](https://github.com/vue-solana/vue-solana/blob/main/packages/nuxt/src/module.ts), [server.ts, lines 5–52](https://github.com/vue-solana/vue-solana/blob/main/packages/nuxt/src/runtime/server.ts).
- Auto-imported composables are SSR-safe, but real RPC and wallet work should run after hydration; the Nuxt runtime plugin is client-only while a separate server plugin handles cluster/endpoints — [README, lines 91–95](https://github.com/vue-solana/vue-solana/blob/main/README.md), [module.ts, lines 125–140](https://github.com/vue-solana/vue-solana/blob/main/packages/nuxt/src/module.ts).
- Browser and mobile wallet behavior is already a high-risk area: Android MWA submission is intentionally routed through app RPC, wallets may rewrite transactions before signing, and the plugin enforces single-wallet authorization with in-place `connect()` replacement — [transactions guide, lines 24–26](https://github.com/vue-solana/vue-solana/blob/main/apps/docs/content/guides/transactions.md), [transactions guide, lines 237–238](https://github.com/vue-solana/vue-solana/blob/main/apps/docs/content/guides/transactions.md), [AGENTS.md](https://github.com/vue-solana/vue-solana/blob/main/AGENTS.md).
- Any English docs change must be mirrored into every locale directory with the same file set, heading levels/order, and code-fence count; `pnpm test` enforces this — [locale-docs.test.ts, lines 6–12](https://github.com/vue-solana/vue-solana/blob/main/packages/core/src/locale-docs.test.ts), [locale-docs.test.ts, lines 85–104](https://github.com/vue-solana/vue-solana/blob/main/packages/core/src/locale-docs.test.ts), [locale-docs.test.ts, lines 137–161](https://github.com/vue-solana/vue-solana/blob/main/packages/core/src/locale-docs.test.ts).
- Package-facing changes require a changeset and CI runs lint, format, test, typecheck, package builds, export checks, smoke installs, and e2e — [README, lines 191–213](https://github.com/vue-solana/vue-solana/blob/main/README.md), [root package.json, lines 18–42](https://github.com/vue-solana/vue-solana/blob/main/package.json).

### Inferences

- A candidate that adds an npm dependency with its own Kit range, a static import into a root barrel, or a UI/mobile protocol path is structurally disadvantaged before its product value is considered.
- The cheapest durable slice is one that reuses the existing RPC client and action-state machinery, exposes one narrow core function, one Vue composable, and one Nuxt alias, and can be demonstrated by extending the existing transaction panel and RPC mocks rather than introducing a new app or package.
- Docs translation is not optional drag; it is a hard release gate, so adding a new top-level guide page multiplies the cost more than adding a section to an existing guide whose headings are mirrored deliberately.

### Gaps

- No feature-usage telemetry or issue-volume dataset was available in the inspected local sources, so “adoption impact” below is a product judgment from API coverage and docs/example gaps, not a measured conversion or retention estimate.
- Official Solana ecosystem pages could not be retrieved in this session: web search returned HTTP 402 and direct `solana.com/docs` fetches returned HTTP 429, so external ecosystem trend claims are intentionally omitted.

## Which feature categories can ship as a coherent vertical slice across core, Vue, Nuxt, docs, examples, and tests without excessive ongoing maintenance?

### Takeaway

Read-oriented transaction observability is the best vertical slice: a transaction-history/activity API can be added as a Kit-native core helper, a Vue composable, a Nuxt auto-import, a section in the existing transactions guide, a panel in both examples, and an extension of the already-mocked `getSignaturesForAddress` e2e path. Transaction simulation already shipped, so history is the missing bookend rather than a duplicate.

### Cited Findings

- The current core transaction surface contains sign/send, simulate, and confirm helpers, while the Vue package exposes matching composables; there is no transaction-history/activity API in `packages/vue/src/composables/` or in the core barrel — [transaction.ts, lines 33–144](https://github.com/vue-solana/vue-solana/blob/main/packages/core/src/transaction.ts), [transaction.ts, lines 146–249](https://github.com/vue-solana/vue-solana/blob/main/packages/core/src/transaction.ts), [core index.ts, lines 1–15](https://github.com/vue-solana/vue-solana/blob/main/packages/core/src/index.ts), [Vue composables directory](https://github.com/vue-solana/vue-solana/blob/main/packages/vue/src/composables).
- The only current product use of `getSignaturesForAddress` is Solana Pay settlement lookup, which polls a reference and verifies the found transaction; the e2e mock already answers that RPC method with an empty array — [solana-pay.md, lines 43 and 159](https://github.com/vue-solana/vue-solana/blob/main/apps/docs/content/guides/solana-pay.md), [solana-pay-confirmation.ts, lines 11–13](https://github.com/vue-solana/vue-solana/blob/main/packages/core/src/solana-pay-confirmation.ts), [e2e/helpers.ts, lines 360–364](https://github.com/vue-solana/vue-solana/blob/main/e2e/helpers.ts).
- Existing composable infrastructure already covers reactive requests, subscriptions, tracked data, and SWR adapters, so a history composable can reuse established state/caching patterns rather than invent a new runtime — [imports.ts, lines 3–50](https://github.com/vue-solana/vue-solana/blob/main/packages/nuxt/src/imports.ts), [vue package.json, lines 44–55](https://github.com/vue-solana/vue-solana/blob/main/packages/vue/package.json).
- Simulation is already a complete cross-layer slice: `simulateTransaction()` in core, `useSimulateTransaction()` in Vue, `useSolanaSimulateTransaction()` in Nuxt, a docs section, and example panels in both apps — [roadmap.md, lines 12–17](https://github.com/vue-solana/vue-solana/blob/main/apps/docs/content/roadmap.md), [vue package.json, lines 180–183](https://github.com/vue-solana/vue-solana/blob/main/packages/vue/package.json), [Vue simulate panel](https://github.com/vue-solana/vue-solana/blob/main/examples/vue-vite/src/components/panels/SimulateTransactionPanel.vue), [Nuxt simulate panel](https://github.com/vue-solana/vue-solana/blob/main/examples/nuxt/app/components/SimulateTransactionPanel.vue).
- Nuxt server RPC utilities are described as missing in the roadmap, but `createServerSolanaClient()` and `useServerSolanaClient()` already exist and are exported from `@vue-solana/nuxt/server`; the source is more current than that roadmap line — [roadmap.md, line 18](https://github.com/vue-solana/vue-solana/blob/main/apps/docs/content/roadmap.md), [nuxt package.json, lines 39–42](https://github.com/vue-solana/vue-solana/blob/main/packages/nuxt/package.json), [server.ts, lines 37–52](https://github.com/vue-solana/vue-solana/blob/main/packages/nuxt/src/runtime/server.ts).
- Wallet modal/UI, Anchor helpers, desktop native wallets, RPC failover, and advanced indexing are explicitly characterized as large API or architecture commitments in the public roadmap — [roadmap.md, lines 20–21](https://github.com/vue-solana/vue-solana/blob/main/apps/docs/content/roadmap.md), [roadmap.md, lines 41–55](https://github.com/vue-solana/vue-solana/blob/main/apps/docs/content/roadmap.md).
- Versioned docs would touch the whole docs tree and locale mirror; it does not add a package capability — [roadmap.md, lines 19 and 53–55](https://github.com/vue-solana/vue-solana/blob/main/apps/docs/content/roadmap.md), [locale-docs.test.ts, lines 85–104](https://github.com/vue-solana/vue-solana/blob/main/packages/core/src/locale-docs.test.ts).

### Inferences

- **Top recommendation: transaction history/activity feed.** It is the only candidate that is simultaneously missing, broadly useful, low-dependency, SSR-safe, and almost free to test with the existing RPC mock surface.
- **Runner-up: priority-fee/compute-budget helpers.** They fit the same Kit-native, read-only shape and would improve production reliability, but fee advice is dynamic and easier to get subtly wrong; they are a strong second slice, not the first.
- A coherent first release should avoid a new npm package. A new `@vue-solana/ui` package would create a second design/accessibility/versioning surface, while a core subpath plus a Vue composable plus a Nuxt alias uses the release machinery already in place.
- Finishing/documenting server RPC utilities is lower-risk than most candidates but less of a “next feature”: the runtime already exports the utility, so the remaining work is docs/tests/experience rather than a new capability.

### Gaps

- No maintenance-cost data (bug counts, support load, changelog churn by feature area) was available locally, so maintainability scores are based on architectural surface area and dependency/security exposure.
- The exact stable Kit TypeScript shape for paginated signature metadata in the installed version was not separately verified from regenerated `.d.ts` output; implementation should confirm it against `@solana/kit@^8.6.0` before freezing public types.

## Which categories create long-term support liabilities, security obligations, chain-specific behavior, or heavy dependencies?

### Takeaway

The highest-liability categories are money-moving program helpers, wallet UI/protocol work, Anchor/IDL codegen, and RPC failover. They either own user funds/signing semantics, track fast-moving chain-specific standards, or change the client architecture in ways that are hard to test across Vue, Nuxt, browser, and mobile.

### Cited Findings

- SPL token and Anchor helpers would add program-specific instruction/account semantics; the public roadmap lists Anchor provider/helpers and does not list completed SPL action helpers, while the current package only has read helpers for token accounts and balances — [roadmap.md, lines 41–43](https://github.com/vue-solana/vue-solana/blob/main/apps/docs/content/roadmap.md), [core token-accounts.ts](https://github.com/vue-solana/vue-solana/blob/main/packages/core/src/token-accounts.ts), [vue package.json, lines 192–199](https://github.com/vue-solana/vue-solana/blob/main/packages/vue/package.json).
- Token/native actions are money-moving: the transaction guide already warns developers to use devnet, display what users sign, check capabilities, avoid duplicate submissions after timeout, and never expose funded keys — [transactions guide, lines 156 and 324–334](https://github.com/vue-solana/vue-solana/blob/main/apps/docs/content/guides/transactions.md).
- Nuxt public config deliberately rejects `payer`, `payerSecretKey`, and `wallet`, and server utilities strip the same fields; any feature that “helpfully” accepts a signer in config would violate an explicit security boundary — [module.ts, lines 42–50 and 203–225](https://github.com/vue-solana/vue-solana/blob/main/packages/nuxt/src/module.ts), [server.ts, lines 16–40](https://github.com/vue-solana/vue-solana/blob/main/packages/nuxt/src/runtime/server.ts).
- Wallet behavior already includes Android MWA session quirks, iOS deep links/callbacks, Wallet Standard signature verification, and exclusive-connect sweeps; adding a modal or native protocol support expands that matrix — [README, lines 58–72](https://github.com/vue-solana/vue-solana/blob/main/README.md), [core package.json, lines 124–134](https://github.com/vue-solana/vue-solana/blob/main/packages/core/package.json), [AGENTS.md](https://github.com/vue-solana/vue-solana/blob/main/AGENTS.md).
- Heavy static edges are guarded in CI: mobile wallet code, Buffer, `qrcode`, and `jsqr` must remain subpath/dynamic, and iOS/tweetnacl reachability is already tolerated debt rather than a greenfield opportunity — [check-lean-imports.mjs, lines 65–86](https://github.com/vue-solana/vue-solana/blob/main/scripts/check-lean-imports.mjs).
- RPC failover would change client construction, Nuxt endpoint configuration, SSR/server-plugin semantics, and retry/error policy; the current module already has nuanced per-key runtime-config merge rules that defaults must not clobber — [module.ts, lines 60–73 and 152–197](https://github.com/vue-solana/vue-solana/blob/main/packages/nuxt/src/module.ts), [module.ts, lines 125–131](https://github.com/vue-solana/vue-solana/blob/main/packages/nuxt/src/module.ts).
- Error decoding is safer than token/Anchor work but still has a maintenance tail: core owns a closed `SolanaErrorCode` vocabulary and deliberately leaves raw `cause` data for debugging rather than user-facing strings — [errors.ts, lines 3–31](https://github.com/vue-solana/vue-solana/blob/main/packages/core/src/errors.ts), [errors guide, lines 134–152](https://github.com/vue-solana/vue-solana/blob/main/apps/docs/content/guides/errors.md).

### Inferences

- Avoid anything where a wrong abstraction can cause duplicate transaction submission, mistaken chain/cluster display, or a funded key leak; those failures are product-trust failures, not just API bugs.
- Avoid anything that requires maintaining a catalog (wallets, IDLs, program errors, provider endpoints) unless the catalog is the product. Catalogs create continuous release pressure and stale docs.
- Transaction history has a contained liability: raw RPC metadata can be returned mostly as-is, with normalization limited to stable fields and clear “not decoded” semantics. That keeps program-specific interpretation out of v1.

### Gaps

- No legal/compliance review data was available for transaction-history retention, indexing, or explorer links; the recommendation keeps history read-only and client-side to avoid creating a data-retention surface.
- External wallet/provider behavior changes could not be validated from official sources in this session because `solana.com/docs` fetches were rate-limited.

## Which categories would materially improve first-time developer success, daily dapp development, or production reliability?

### Takeaway

First-time success is currently well served by setup, wallet discovery, simulation, and transaction guides; the remaining visible gap is “what happened after I sent it?” A history/activity API improves daily dapp work and production support without asking developers to adopt a new UI or security model.

### Cited Findings

- The getting-started/docs surface already covers installs, Vue setup, Nuxt setup, clusters, RPC state, balances, wallet state, and transaction flows — [README, lines 97–123](https://github.com/vue-solana/vue-solana/blob/main/README.md), [transactions guide, lines 8–10](https://github.com/vue-solana/vue-solana/blob/main/apps/docs/content/guides/transactions.md).
- The transaction guide explicitly tells users what to do after a timeout — keep the signature and check status before retrying — but offers no library-level history feed for finding or listing those signatures — [transactions guide, lines 208 and 332–333](https://github.com/vue-solana/vue-solana/blob/main/apps/docs/content/guides/transactions.md).
- Explorer-link guidance is hand-written in the docs and cluster-aware, showing a common app need that a history helper could centralize without prescribing UI — [transactions guide, lines 239–250](https://github.com/vue-solana/vue-solana/blob/main/apps/docs/content/guides/transactions.md).
- Simulation already improves pre-submit confidence by exposing `err`, `logs`, `fee`, balance changes, loaded addresses, return data, and compute units — [transactions guide, lines 28–30](https://github.com/vue-solana/vue-solana/blob/main/apps/docs/content/guides/transactions.md).
- Error guidance improves reliability but stays deliberately generic: stable codes for UI decisions, raw causes for logs, and “check signature status before retrying” after timeouts — [errors guide, lines 8–10 and 155–161](https://github.com/vue-solana/vue-solana/blob/main/apps/docs/content/guides/errors.md).
- No priority-fee helper is exposed in the Vue export map; the only package mention is a signer note that wallets may modify priority fees — [vue package.json, lines 27–204](https://github.com/vue-solana/vue-solana/blob/main/packages/vue/package.json), [useWalletAccountTransactionSigner.ts, line 32](https://github.com/vue-solana/vue-solana/blob/main/packages/vue/src/composables/useWalletAccountTransactionSigner.ts).

### Inferences

- The highest-leverage product improvement is closing the transaction lifecycle loop: simulate → sign/send → confirm → **list/inspect past activity**. It benefits first-time users (visible feedback), daily developers (less RPC plumbing), and production teams (support/debugging).
- Priority fees and error explanation are valuable but narrower: they improve a transaction attempt, whereas history improves every app that has users and a wallet address.
- A wallet modal would improve first-time connection success but is a UI product bet; the README currently says apps should build their own selection UI with `useWallets()`, so changing that stance is a strategic product pivot, not an incremental feature.

### Gaps

- No user interviews, GitHub issue labels, or npm download trend by feature were available in the inspected sources; impact ordering is inferred from documented workflow gaps and current API coverage.
- No performance budget for a new history panel was measured; the proposal assumes data fetching is triggered by user action or a watcher, not SSR prerender of large transaction lists.

## How should candidates be scored? Propose a rubric and apply it to at least 8 concrete candidates.

### Takeaway

Use a 100-point rubric that rewards architecture fit and small-slice feasibility, and penalizes security/dependency/chain-specific burden. Applying it to ten candidates puts transaction history first (87) and priority-fee/compute-budget helpers second (82), with wallet modal, Anchor/IDL, token-2022, and RPC failover materially behind.

### Cited Findings

- Rubric dimensions were chosen from the constraints and evidence above: ESM/subpath/Kit/bundle rules come from package exports and lean-import checks; vertical-slice requirements come from core/Vue/Nuxt structure; adoption and burden come from docs/example coverage and security boundaries — [core package.json, lines 23–43](https://github.com/vue-solana/vue-solana/blob/main/packages/core/package.json), [check-lean-imports.mjs, lines 46–86](https://github.com/vue-solana/vue-solana/blob/main/scripts/check-lean-imports.mjs), [imports.ts, lines 1–50](https://github.com/vue-solana/vue-solana/blob/main/packages/nuxt/src/imports.ts), [module.ts, lines 203–225](https://github.com/vue-solana/vue-solana/blob/main/packages/nuxt/src/module.ts).
- Scores below are my assessment, not repo-reported metrics; the “basis” column links the local evidence used for each judgment.

**Rubric (higher is better):**

| Dimension                                  | Max | What a high score means                                                                                                           |
| ------------------------------------------ | --: | --------------------------------------------------------------------------------------------------------------------------------- |
| Architecture fit                           |  20 | Kit-native, no duplicate Kit, no heavy static edge, ESM/subpath-safe, SSR-safe, no secret/wallet boundary changes                 |
| Vertical-slice coherence                   |  15 | Natural core helper + Vue composable + Nuxt auto-import + docs section + example panel + unit/e2e tests                           |
| Adoption impact                            |  25 | Broad first-time-success, daily-development, or production-reliability value across many dapps                                    |
| Small-slice feasibility                    |  20 | Valuable v1 is 1–3 APIs, useful with raw RPC data, testable with existing mocks, no new package/protocol                          |
| Maintainability/security burden (inverted) |  20 | No money movement, no IDL/program catalog, no UI/accessibility ownership, no provider failover policy, low docs-translation churn |

**Applied scores:**

| Candidate                                              | Arch /20 | Slice /15 | Impact /25 | Feasible /20 | Burden /20 |  Total | Verdict and basis                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------ | -------: | --------: | ---------: | -----------: | ---------: | -----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Transaction history / activity feed                    |       18 |        14 |         21 |           18 |         16 | **87** | **Choose.** Missing API, existing `getSignaturesForAddress` mock, read-only, fits transactions guide — [core index.ts](https://github.com/vue-solana/vue-solana/blob/main/packages/core/src/index.ts), [e2e/helpers.ts, lines 360–364](https://github.com/vue-solana/vue-solana/blob/main/e2e/helpers.ts), [transactions guide, lines 208 and 239–250](https://github.com/vue-solana/vue-solana/blob/main/apps/docs/content/guides/transactions.md) |
| Priority-fee / compute-budget helpers                  |       18 |        13 |         20 |           17 |         14 | **82** | **Runner-up.** Strong daily/production value, but dynamic fee markets and guidance risk; no current helper surface — [vue package.json, lines 27–204](https://github.com/vue-solana/vue-solana/blob/main/packages/vue/package.json), [useWalletAccountTransactionSigner.ts, line 32](https://github.com/vue-solana/vue-solana/blob/main/packages/vue/src/composables/useWalletAccountTransactionSigner.ts)                                          |
| Human-readable transaction diagnostics / error decoder |       17 |        12 |         18 |           15 |         14 | **76** | Useful but overlaps stable error-code guidance and raw simulation data; program-specific decoding becomes a catalog — [errors.ts, lines 3–31](https://github.com/vue-solana/vue-solana/blob/main/packages/core/src/errors.ts), [transactions guide, lines 28–30](https://github.com/vue-solana/vue-solana/blob/main/apps/docs/content/guides/transactions.md)                                                                                       |
| Finish/document Nuxt server RPC utilities              |       18 |        13 |         15 |           16 |         15 | **77** | Low risk but partially shipped already; mostly docs/tests and experience, not a new capability — [server.ts, lines 37–52](https://github.com/vue-solana/vue-solana/blob/main/packages/nuxt/src/runtime/server.ts), [roadmap.md, line 18](https://github.com/vue-solana/vue-solana/blob/main/apps/docs/content/roadmap.md)                                                                                                                           |
| iOS lazy-loading / bundle trim                         |       15 |        10 |         18 |           14 |         14 | **71** | High engineering value, but performance work rather than a product feature; guardrail already exists — [check-lean-imports.mjs, lines 79–86](https://github.com/vue-solana/vue-solana/blob/main/scripts/check-lean-imports.mjs), [roadmap.md, line 17](https://github.com/vue-solana/vue-solana/blob/main/apps/docs/content/roadmap.md)                                                                                                             |
| RPC failover / health-aware client                     |       12 |         9 |         20 |            8 |          9 | **58** | Production value is real, but changes client construction, config precedence, and retry policy — [module.ts, lines 60–73 and 152–197](https://github.com/vue-solana/vue-solana/blob/main/packages/nuxt/src/module.ts), [module.ts, lines 125–131](https://github.com/vue-solana/vue-solana/blob/main/packages/nuxt/src/module.ts)                                                                                                                   |
| SPL Token / Token-2022 action helpers                  |       11 |         9 |         20 |            9 |          7 | **56** | High demand but money-moving, extension-specific, and new dependency/program churn — [roadmap.md, lines 41–43](https://github.com/vue-solana/vue-solana/blob/main/apps/docs/content/roadmap.md), [transactions guide, lines 324–334](https://github.com/vue-solana/vue-solana/blob/main/apps/docs/content/guides/transactions.md)                                                                                                                   |
| Anchor provider / IDL program helpers                  |       10 |         8 |         22 |            8 |          7 | **55** | Very high developer value for program teams, but IDL/codegen/version surface is a long-term commitment — [roadmap.md, lines 20–21 and 41–43](https://github.com/vue-solana/vue-solana/blob/main/apps/docs/content/roadmap.md)                                                                                                                                                                                                                       |
| Wallet modal / built-in UI package                     |        9 |         9 |         22 |            8 |          6 | **54** | Excellent first-run promise, worst fit: UI/CSS/a11y/SSR/mobile matrix and a second package versioning surface — [README, lines 58–72](https://github.com/vue-solana/vue-solana/blob/main/README.md), [AGENTS.md](https://github.com/vue-solana/vue-solana/blob/main/AGENTS.md)                                                                                                                                                                      |
| Versioned docs                                         |        5 |         8 |         12 |            9 |         11 | **45** | Useful for migrants, but not a library feature and multiplies locale/docs routing work — [roadmap.md, lines 19 and 53–55](https://github.com/vue-solana/vue-solana/blob/main/apps/docs/content/roadmap.md), [locale-docs.test.ts, lines 85–104](https://github.com/vue-solana/vue-solana/blob/main/packages/core/src/locale-docs.test.ts)                                                                                                           |

### Inferences

- The score gap between transaction history and the runner-up is small enough that user requests could justify reordering, but not enough to justify taking on wallet UI, Anchor, or token-action liability in the same release.
- Error decoding and priority fees are good **follow-ups** to history: both can consume the same simulation/history data model without reopening wallet or client architecture.
- “Finishing server RPC utilities” scores respectably, but because the code already exists, its marginal product value is lower than the score alone suggests; treat it as documentation/test debt, not the headline feature.

### Gaps

- Scores are ordinal decisions under uncertainty; no A/B tests, issue counts, or download data were available to calibrate the 25-point impact dimension.
- The analysis did not benchmark bundle size for a concrete history implementation; the estimate assumes only Kit RPC types/utilities are imported and no new dependency is added.

## What is the smallest valuable first slice for your recommended feature, and what should be explicitly deferred?

### Takeaway

Ship **transaction history/activity** as a narrow, read-only vertical slice: `getTransactionHistory()` in core, `useTransactionHistory()` in Vue, `useSolanaTransactionHistory()` in Nuxt, one section in the existing transactions guide mirrored to all locales, one panel in both examples, and unit/e2e tests using a richer `getSignaturesForAddress` mock. Defer decoding, UI opinions, retries, indexing, and fee/wallet changes.

### Cited Findings

- The existing transaction docs already teach signature preservation, cluster-aware explorer links, and status checks, which are the natural UX hooks for a history list — [transactions guide, lines 208 and 239–250](https://github.com/vue-solana/vue-solana/blob/main/apps/docs/content/guides/transactions.md), [transactions guide, lines 332–333](https://github.com/vue-solana/vue-solana/blob/main/apps/docs/content/guides/transactions.md).
- The e2e RPC mock currently returns an empty array for `getSignaturesForAddress`; replacing that with a deterministic fixture is a small extension of an existing test seam — [e2e/helpers.ts, lines 360–364](https://github.com/vue-solana/vue-solana/blob/main/e2e/helpers.ts).
- Vue already has the action/request primitives and Nuxt already has the auto-import pipeline needed for a composable-first feature — [imports.ts, lines 3–50](https://github.com/vue-solana/vue-solana/blob/main/packages/nuxt/src/imports.ts), [useSimulateTransaction.ts, lines 46–89](https://github.com/vue-solana/vue-solana/blob/main/packages/vue/src/composables/useSimulateTransaction.ts).
- Current package exports are explicitly enumerated, so the slice must add exact subpaths and root-barrel decisions consciously rather than relying on directory discovery — [core package.json, lines 27–108](https://github.com/vue-solana/vue-solana/blob/main/packages/core/package.json), [vue package.json, lines 27–204](https://github.com/vue-solana/vue-solana/blob/main/packages/vue/package.json).
- Locale tests require mirrored file sets, heading structure, and code-fence counts, so docs work should be a section in `guides/transactions.md` rather than a new top-level guide unless the extra surface is justified — [locale-docs.test.ts, lines 85–104](https://github.com/vue-solana/vue-solana/blob/main/packages/core/src/locale-docs.test.ts), [locale-docs.test.ts, lines 137–161](https://github.com/vue-solana/vue-solana/blob/main/packages/core/src/locale-docs.test.ts).

**Smallest valuable slice to implement:**

1. **Core:** add a lean `@vue-solana/core/transaction-history` helper wrapping `rpc.getSignaturesForAddress(address, { before, until, limit, commitment })`. Return normalized raw metadata the RPC already provides — signature, slot, block time, error, and confirmation status where available — plus a `hasMore`/cursor hint derived from page length. Normalize transport failures through the existing `normalizeSolanaError(..., "RPC_FAILURE")` pattern — [errors.ts, lines 100–114](https://github.com/vue-solana/vue-solana/blob/main/packages/core/src/errors.ts).
2. **Vue:** add `useTransactionHistory(addressSource, options?)`, following `useSimulateTransaction`’s shallow refs, abort/supersede behavior, and capability checks. Expose `items`, `loading`, `error`, `refresh()`, and `loadMore()`; keep explorer URL construction in the Vue/docs layer using the existing cluster-aware guidance — [useSimulateTransaction.ts, lines 46–108](https://github.com/vue-solana/vue-solana/blob/main/packages/vue/src/composables/useSimulateTransaction.ts), [transactions guide, lines 239–250](https://github.com/vue-solana/vue-solana/blob/main/apps/docs/content/guides/transactions.md).
3. **Nuxt:** register `useSolanaTransactionHistory` in `solanaAutoImports`; do not add any runtime-config field. History is read-only and should use the existing client context — [imports.ts, lines 3–44](https://github.com/vue-solana/vue-solana/blob/main/packages/nuxt/src/imports.ts), [runtime/plugin.ts, lines 10–36](https://github.com/vue-solana/vue-solana/blob/main/packages/nuxt/src/runtime/plugin.ts).
4. **Docs/examples:** add one “Transaction History” section to the English transactions guide and mirror its heading/code-fence structure in every locale; add a small activity list panel to both example apps next to the existing transaction/simulation panels — [transactions guide, lines 1–10](https://github.com/vue-solana/vue-solana/blob/main/apps/docs/content/guides/transactions.md), [Vue simulate panel](https://github.com/vue-solana/vue-solana/blob/main/examples/vue-vite/src/components/panels/SimulateTransactionPanel.vue), [Nuxt simulate panel](https://github.com/vue-solana/vue-solana/blob/main/examples/nuxt/app/components/SimulateTransactionPanel.vue).
5. **Tests/checks:** unit-test empty/full pages, RPC failure normalization, invalid options, abort/supersede, and reactivity; extend the `getSignaturesForAddress` e2e mock with fixture signatures and assert the example panel renders them; run `check:entries`, `check:esm-map`, `size:packages`, `smoke:standalone-installs`, typecheck, and locale structure tests — [e2e/helpers.ts, lines 360–364](https://github.com/vue-solana/vue-solana/blob/main/e2e/helpers.ts), [root package.json, lines 35–42](https://github.com/vue-solana/vue-solana/blob/main/package.json), [locale-docs.test.ts, lines 6–12](https://github.com/vue-solana/vue-solana/blob/main/packages/core/src/locale-docs.test.ts).

**Explicitly defer:**

- Instruction decoding, token-transfer categorization, memo parsing beyond raw fields, and program-specific “human readable” labels; those turn history into an indexer/product catalog.
- Automatic resubmission, retry-on-timeout, or transaction replacement logic; the docs currently require checking status before retrying, not automating it — [transactions guide, lines 332–333](https://github.com/vue-solana/vue-solana/blob/main/apps/docs/content/guides/transactions.md).
- A history UI component or wallet modal; keep the first slice composable-only and let apps own presentation, consistent with the current “apps build their own selection UI” stance — [README, lines 67–72](https://github.com/vue-solana/vue-solana/blob/main/README.md).
- Priority-fee automation, Anchor/IDL helpers, Token-2022 actions, RPC failover, and versioned docs; each is a separate strategic bet with a larger maintenance/profile than this slice — [roadmap.md, lines 20–21 and 41–55](https://github.com/vue-solana/vue-solana/blob/main/apps/docs/content/roadmap.md).
- Server-side persistence or an indexing database; v1 should be a read pass-through from the user’s RPC client, preserving the existing Nuxt secret boundary — [module.ts, lines 203–225](https://github.com/vue-solana/vue-solana/blob/main/packages/nuxt/src/module.ts), [server.ts, lines 16–40](https://github.com/vue-solana/vue-solana/blob/main/packages/nuxt/src/runtime/server.ts).

### Inferences

- If the history slice lands, the next release can add a diagnostics view that combines history items with simulation logs and normalized errors, then a separate priority-fee helper; both become additive rather than competing architecture changes.
- If the team wants a single headline instead of a lifecycle series, priority-fee/compute-budget helpers are the runner-up, but they should be framed as “safer sends” and explicitly documented as estimates, not guarantees.

### Gaps

- No implementation was performed and no repository files were modified beyond this notes file, so bundle-size and test results for the proposed slice are forecasts rather than measurements.
- The final public type names and option shapes should be validated against the installed Kit declarations and the project’s export-map/docs tests before implementation begins.
