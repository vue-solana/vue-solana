# Package Improvements Plan

Tracks audit improvements for `@vue-solana/core`, `@vue-solana/vue`, and `@vue-solana/nuxt` from the 2026-10-06 three-package audit.

Do not split the existing public API to fix these items unless the phase says so. Fixes must preserve the unified `useWallets()` / `useWallet()` flow, the full `kit` mirror subpaths, and the ESM-only module format.

When a plan item is implemented, check its box (`- [x]`). Keep all items in place — completed phases retain their checked tasks and acceptance criteria as a record; only the phase title gains the `[x]` marker.

Example completed phase format:

```md
## [x] Phase 1: Critical Correctness
```

Priority labels, highest first:

- **P0** — Correctness / crash / wrong types / SSR leak. Implement first.
- **P1** — DX / bundle regression / docs lie about behavior. Implement next.
- **P2** — Maintainability / tooling guard / nice-to-have coverage. Implement after P0/P1.

## Scope

Initial scope:

- Fix verified P0 correctness bugs in all three packages.
- Trim verified bundle regressions and restore lazy-load splits.
- Fix READMEs that contradict `packages/core/src/kit.ts` about the planner/executor.
- Add parity / export-map / pack-size guards so regressions fail CI.
- Fill targeted test gaps for untrusted input and lifecycle edges.

Deferred scope:

- Async `tweetnacl` ECDH in `packages/core/src/ios-wallet/crypto.ts` (static `import * as naclModule` keeps ~32 KB in the chunk; making it `await import()` cascades through synchronous `getSolanaIosWallets` / `handleSolanaIosWalletCallback` / `createPendingRequest` / `launchConnect` — startup race documented by the `ponytail:` comment; do not attempt here).
- Desktop native wallets beyond the unified flow (`plans/native-wallet-plan.md` owns this).
- Solana Pay / QR work (`plans/solana-pay-qr-plan.md` owns this).
- TanStack Query adapter (already recorded as out of scope in `plans/react-readme-parity-plan.md`).

## Design Principles

- Core stays DOM-free; browser APIs live in `@vue-solana/vue`.
- `kit` subpaths stay a faithful `export * from "@solana/kit"` mirror; the four colliding names (`SolanaError`, `isSolanaError`, `SolanaErrorCode`, `TransactionStatus`) resolve in root barrels only.
- Every error composables throw is core's `SolanaError`; `isSolanaError()` must stay true for them.
- Nuxt never accepts or forwards `payer` / `payerSecretKey`.
- Root barrels stay lean; heavy or platform-specific modules ship as subpaths only (precedent: `buffer-polyfill` exclusion in `packages/core/src/index.ts:16-23`).
- Hand-synced maps (vue `entries` ↔ `exports`, nuxt auto-import table) get a test, not just discipline.

## [x] Phase 1: Critical Correctness

Status: complete. Verified: `format`, `lint`, `test` (70 files / 673 tests), `typecheck` (incl. docs + examples), `build:packages`, `build:examples`, `docs build`, `test:e2e` (24 passed), `smoke:standalone-installs` (core/vue/nuxt standalone consumers install + typecheck clean).

Tasks:

- [x] Core root barrel pulls `ios-wallet` + `mobile-wallet` — removed both from root `index.ts`, kept subpaths only; `dist/index.mjs` contains zero `mobile-wallet`/`ios-wallet`/`tweetnacl` matches. SSR regression test in `useSolana.test.ts` asserts a fresh context (distinct `wallet`/`status`/`wallets` refs) per call.
- [x] Vue SSR singleton — `useSolana()` now returns `createSsrContext()` per call, no module-scope cache.
- [x] Nuxt `nuxt/schema` augmentation never shipped — block moved into `src/module.ts` (plus type-only `import type {} from "nuxt/schema"` so the augmentation resolves under TS2664 rules); stale `src/runtime/types.d.ts` deleted; `dist/module.d.ts` verified to contain `declare module "nuxt/schema"` + `solana?: ModuleOptions`.
- [x] Nuxt runtime plugin untyped + crashes on missing config — `#app` shim now mirrors the real passthrough signature; runtime defaults to `(useRuntimeConfig().public.solana ?? {})`; `dist/runtime/plugin.d.ts` verified typed (no `unknown`).
- [x] `useSignatureStatus` polling — chained `setTimeout`, same-signature in-flight join, `onScopeDispose`, signature change restarts after manual stop.
- [x] `SolanaConfig.commitment` wired into an explicit RPC stack when set; stock `solanaRpc()` path kept when unset.
- [x] Nuxt plugin forwards `...rest` after deleting `wallet`/`payer`/`payerSecretKey`/`clientPlugin`, with secret-strip / future-field / missing-config tests.
- [x] Declaration regression tests in `module.test.ts` guard the `nuxt/schema` block and the typed `#app` shim at source level (source, not `dist/`, because CI runs `test` before `build`).

Acceptance criteria:

- Bare `import { createSolanaClient } from "@vue-solana/core"` no longer pulls ios/mobile wallet code.
- Concurrent SSR requests cannot share wallet/status refs.
- Fresh consumer gets typed `runtimeConfig.public.solana` with no local shim.
- Runtime plugin with deleted/undefined `public.solana` does not throw raw `TypeError`.
- Changing signature after `stopPolling()` restarts polling; slow RPCs never overlap.

## Phase 2: Core Input Validation And Error Handling — P0

Status: implemented and verified. Gates green: `pnpm test` (699), `typecheck`, `lint`, `format`, `build:packages`, `build:examples`, `docs build`, `test:e2e` 24/24, `smoke:standalone-installs` (all three consumers install + typecheck against local tarballs; script fixed for pnpm 10 overrides/build-approval along the way).

Tasks:

- [x] `getWebSocketEndpoint()` raw `TypeError` on malformed endpoint (`packages/core/src/clusters.ts:29-39`). Validate / wrap in `SolanaError(INVALID_INPUT)`.
- [x] `toAddressInput()` falls through to `value.value` for unexpected shapes (`packages/core/src/address.ts:31-45`). Throw `INVALID_ADDRESS` for numbers/objects instead of returning `null`.
- [x] `confirmTransactionSignature()` fixed 1500 ms poll, no abort, no commitment passthrough, generic not-found error (`packages/core/src/transaction.ts:68-111`). Add `{ pollIntervalMs?, abortSignal? }` to `ConfirmTransactionOptions`, keep the commitment check client-side (`getSignatureStatuses` takes no commitment parameter), throw distinct not-found vs failed vs timeout `SolanaError`.
- [x] `waitForRedirect()` never settles (`packages/core/src/ios-wallet/browser.ts:79-81`, awaited in `adapter.ts:91-93` and `deep-links.ts:130`). Add timeout/AbortSignal rejection or document reload-only settlement via `handleSolanaIosWalletCallback()`.
- [x] Adapted wallet leaks `change` subscription (`packages/core/src/wallet-standard/adapter.ts:52-61`). Store the unsubscribe handle and expose `dispose()`.
- [x] `isSolanaError()` is `instanceof`-only (`packages/core/src/errors.ts:42-44`). Add duck-type fallback (`name === "SolanaError"` + `typeof code === "string"`) for duplicate package copies.
- [x] `TokenAccountInfo` trusts RPC shapes (`packages/core/src/token-accounts.ts:143-151`). Validate `tokenAmount.amount`/`decimals`/`state` before constructing; throw `RPC_FAILURE` on mismatch instead of raw `BigInt()` throw.
- [x] Corrupt iOS session throws raw (`packages/core/src/ios-wallet/storage.ts:30-44`). Try/catch `bs58.decode`, purge + return `[]` on failure.
- [x] `withTimeout()` has no signal passthrough or `timeoutMs` validation; `withSolanaTimeout()` hardcodes one timeout (`packages/core/src/timeout.ts:3-41`). Validate `NaN`/negative, accept optional `signal`, allow caller error `code`.
- [x] `STORAGE_FAILURE` defined but never thrown in core (`packages/core/src/errors.ts:9`; only `packages/vue/src/plugin/selected-wallet-storage.ts` uses it). Document as cross-package shared code or move it.

Acceptance criteria:

- Malformed endpoint / address / token-account / session payloads produce `SolanaError`, never raw `TypeError`/`BigInt` throws.
- Confirmation flow is cancellable, interval-configurable, and distinguishes not-found from failure.
- `isSolanaError()` survives duplicate package copies.

## Phase 3: DX And API Consistency — P1

Status: implemented.

Tasks:

- [x] Nuxt auto-import table lags Vue (`packages/nuxt/src/imports.ts:3-56`). Added `tryUseSolana` (`packages/vue/src/composables/useSolana.ts:6`), `useClientCapability` (aliased as `useSolanaClientCapability`), and `clearSwrCache` (`packages/vue/src/swr.ts:56`); `imports.ts` is the source of truth, and `module.test.ts` covers the registered sources. (An exhaustive "every public `use*` has an alias" assertion was not added — the auto-import set is curated, not exhaustive.)
- [x] `MissingClientCapabilityError extends Error`, not core `SolanaError` (`packages/vue/src/composables/useClientCapability.ts:7-26`). Subclass/wrap as `SolanaError` or document the `instanceof` split.
- [x] Unconditional `console.info/error` in library code (`packages/vue/src/plugin.ts:77-81,101-115,174,190,215,264`, `packages/vue/src/composables/useWallet.ts:33,40,62,67`). Gate behind `debug` option or remove; never log in hot paths.
- [x] Internal code calls deprecated `useConnection()` (`packages/vue/src/composables/useBalance.ts:10-11`, `useAccountInfo.ts:24-25`, `useSignatureStatus.ts:28-29`; deprecated at `useConnection.ts:7-9`). Call `useSolanaClient()` / `tryUseSolana()` directly.
- [x] `SelectedWalletAccountProvider` props read once (`packages/vue/src/components/SelectedWalletAccountProvider.ts:27-31`). Watch `filterWallet`/`stateSync` and re-provide, or document as init-only.
- [x] No `./plugin`, `./injection`, `./components/*` subpaths (`packages/vue/package.json:27-172`; provider + keys root-only via `src/index.ts:30-33`). Add subpaths or document root-only imports.
- [x] `signTransactions` vs `signAllTransactions` identical signatures, precedence undocumented (`packages/core/src/types.ts:102-112`, `packages/core/src/wallet.ts:90-98`). Document which is tried first; deprecate one name.
- [x] `GetSolanaIosWalletsOptions.appIdentity` never read (`packages/core/src/ios-wallet/adapter.ts:24-30`, defined in `src/ios-wallet/types.ts:9-14`). Honor it or remove the field.
- [x] `registeredMobileWalletKeys` module-global with no reset (`packages/core/src/mobile-wallet.ts:26-58`). Expose `unregisterSolanaMobileWallet()` or test-only reset for HMR/tests.
- [x] Duplicate abort helpers (`packages/core/src/action.ts:38-42` exports `isAbortError` and `isSolanaActionAborted()`). Keep one canonical name, alias the other as deprecated.
- [x] Nuxt `DefinedNuxtModule` fragile typing (`packages/nuxt/src/module.ts:16`). Type as `NuxtModule<ModuleOptions>` from `@nuxt/kit` / `@nuxt/schema`.
- [x] Nuxt plugin ordering unspecified (`packages/nuxt/src/module.ts:91-104`). Set explicit `order: -10` (or document `dependsOn`/ordering contract for `clientPlugin: false` users).
- [x] SWR cache shared across SSR requests with no server clear (`packages/vue/src/swr.ts:30-37` surfaced via Nuxt). Document per-request namespacing / `clearSwrCache()` for SSR, or ship a tiny server plugin doing it.

Acceptance criteria:

- Every public Vue composable has a Nuxt alias or a documented reason it does not.
- Capability failures answer `isSolanaError()` the same way runtime failures do (or docs state the split).
- No `console.*` fires in library hot paths by default.

## Phase 4: Bundle And Performance — P1

Status: planned.

Tasks:

- [x] Nuxt pre-bundles the lazy mobile wallet (`packages/nuxt/src/module.ts:26-38` `VITE_OPTIMIZE_DEPS` includes `@solana-mobile/wallet-standard-mobile`, but `packages/vue/src/plugin.ts:165` lazy-imports it ~98 KB Android-only). Drop the entry from `include`; prefer bare package names over `a > b > c` chains where Vite accepts them.
- [x] `tweetnacl/nacl-fast.js` rows may be dead (`packages/nuxt/src/module.ts:31-32,36-37`; core `packages/core/src/kit.ts:23-45` uses Kit `createKeyPairFromBytes`/`signBytes`, only bare `tweetnacl` remains for iOS ECDH). Verify with bundle grep, drop if unreferenced.
- [x] `bs58` duplicates Kit codecs (`packages/core/package.json:119`; 11 source files in `src/ios-wallet/*.ts` + `src/wallet-standard/adapter.ts`, while `src/kit.ts:6` already uses Kit `getBase58Encoder/getBase58Decoder`). Replace and drop the dep. Also drop `bs58` test-only devDep in vue (`packages/vue/src/composables/useSignatureStatus.test.ts:1` sole consumer) in favor of Kit codecs.
- [x] `buffer` is a hard dep for one subpath (`packages/core/package.json:120`, only `src/buffer-polyfill.ts:1` needs it). Move to `optionalDependencies` or document as subpath-only peer.
- [ ] Vue plugin chunk carries iOS + wallet-standard statically (`packages/vue/src/plugin/wallet-registry.ts:1-13`; only `mobile-wallet` is lazy). Lazy-load the iOS adapter behind `iosWallet !== false` + iOS-UA gate if the chunk proves heavy.
- [x] SWR module `Map` unbounded, all-or-nothing clear, sync-flush writes (`packages/vue/src/swr.ts:50,132-136`). Add per-key `deleteSwrKey()` / size cap (or document key hygiene); confirm `flush: "sync"` is intentional.
- [x] Vue build pins 8 GB (`packages/vue/package.json:181` `NODE_OPTIONS=--max-old-space-size=8192 unbuild`). Investigate the OOM (likely kit mirror decl) rather than pinning memory in the script. _(OOM reproduced without the pin; pin retained.)_
- [x] Document lean-import guidance: `import { … } from "@vue-solana/core/address|errors|timeout"` for size-sensitive entries (root is ~117 KB via the intentional kit mirror, `packages/core/src/kit-mirror.test.ts:28-31`); add a size-limit CI check so a Kit-heavy import into `address/errors/timeout/clusters` is caught. Same for vue root vs subpath chunks. (`scripts/check-lean-imports.mjs`, `pnpm size:packages`; core README updated.)

Acceptance criteria:

- Dev pre-bundling no longer defeats the mobile-wallet lazy split.
- `bs58` / `nacl-fast.js` removals verified by bundle grep, not assumption.
- Size guards fail CI before a new heavy import lands in a lean entry.

## Phase 5: Maintainability And Tooling — P2

Status: planned.

Tasks:

- [x] Windows backslash auto-import paths (`packages/nuxt/src/imports.ts:94` `vueSource` uses `node:path` `join()`). Normalize to posix (`replace(/\\/g, "/")` or `pathToFileURL`).
- [x] Eager optimize-deps merge pollutes SSR (`packages/nuxt/src/module.ts:73` runs unconditionally while `vite:extendConfig` correctly skips non-clients). Drop the eager merge or gate it identically.
- [x] Vue `entries` ↔ `exports` hand-synced (36 subpaths, `packages/vue/build.config.ts:4-41` vs `package.json:27-172`). Covered by `scripts/check-export-map.ts` (run as `pnpm check:entries`), which imports `build.config.ts` directly instead of regex-parsing it.
- [x] Core export-map/docs test is regex-fragile and cross-package-coupled (`packages/core/src/export-map-docs.test.ts:87-96` scrapes `apps/docs/` and `packages/vue|nuxt` layouts). Move to repo-root tooling or parse `package.json` exports + `build.config.ts` instead of regex.
- [x] No package-level `attw`/`publint` (`packages/core/package.json:105-110`). Add `"attw": "attw --pack ."` or `publint` to CI to validate the ESM-only map.
- [x] No externals-bundling guard (`packages/core/build.config.ts:25-32` sets `hoistTransitiveImports: false`). Add a build-output test asserting `dist/*.mjs` contain no bundled `@solana/kit` code.
- [x] Pack-size invariant unguarded (`packages/nuxt/package.json:40-43`, and core/vue equivalents). Add a tarball file-list / byte-budget assertion covering the `.d.mts` exclusion.
- [x] Vue devDeps under-declared (`packages/vue/package.json:192-197`; tests import `@vue/test-utils`, `vitest` but only `bs58, typescript, unbuild, vue` listed). Declare `vitest` + `@vue/test-utils` (or document root-provided) so the package tests standalone.
- [x] Alias subpaths can drift (`packages/vue/src/useIdentity.ts:1`, `src/useSendTransactions.ts:1`, `build.config.ts:13,21`). Add comment/test that they stay aliases, or collapse to one entry each.
- [x] `tsc --noEmit` skips test helpers (`packages/vue/tsconfig.json:6` includes only `src/**/*.ts`; root `test-utils.ts` ships un-typechecked). Include/exclude explicitly.
- [x] Core declarations post-step is string-scan fragile (`packages/core/scripts/prepare-declarations.mjs:7,32` hardcoded `shims=["buffer.d.ts"]`, run as post-`unbuild` shell step in `package.json:106`). Convert to an `unbuild` hook or add a test asserting emitted `buffer-polyfill.d.*` has the triple-slash reference.
- [x] Core tsconfig misses the published shim (`packages/core/tsconfig.json:6` covers `../../types/**/*.d.ts` but not `packages/core/types/buffer.d.ts`). Include `types/**/*.d.ts` locally.
- [x] `kit.test.ts` leans on real Kit behavior (`packages/core/src/kit.test.ts:1-33,64` `'payer' in client` via real `createClient/extendClient`). Pin the assumption with a comment + Kit version assertion, or mock `createClient`.
- [ ] Nuxt `module.test.ts` never exercises real `defineNuxtModule` (`packages/nuxt/src/module.test.ts:5-14` mocks it as identity). Test against the real module (or add one `@nuxt/test-utils` integration test) covering defaults, `clientPlugin: false`, non-object `public.solana`.
- [x] `qrcode` ghost reference (`packages/nuxt/src/module.test.ts:177-201` fixture only). Rename fixture to a neutral name.
- [x] Root `vitest.config.ts` aliases only a subset of `@vue-solana/vue/*` subpaths. Replace enumerated aliases with a wildcard/filesystem-mapped alias or generate from `packages/vue/package.json` `exports`.
- [ ] Document the 5th-colliding-name procedure (`packages/core/src/kit.ts:140-156`, resolved in `src/index.ts:30-32`, guarded by `src/kit-mirror.test.ts:13-15`): when Kit adds a colliding name, add it to the explicit re-export list + test.

Acceptance criteria:

- New Vue subpath without `entries` + `exports` fails CI.
- New public composable without a Nuxt alias (or documented omission) fails CI.
- `attw`/`publint`, externals, and pack-size guards run in CI.

## [x] Phase 6: Documentation Accuracy — P1

Status: implemented.

Tasks:

- [x] Fix the planner/executor claim in all three READMEs: `packages/core/README.md:125`, `packages/vue/README.md:101,394-395`, `packages/nuxt/README.md:169` say the default client composes `solanaRpc()` + `rpcTransactionPlanner()` + `rpcTransactionPlanSendingExecutor()`; code calls only `solanaRpc()` + `rpcAirdrop()` (`packages/core/src/kit.ts:37-44`, planner comes via `solanaRpc` itself per repo policy). Rewrite per `AGENTS.md`.
- [x] Sync core README API table (`packages/core/README.md:155-176`): add `registerSolanaMobileWallet`, `isSolanaMobileWalletSupported`, iOS helpers (`getSolanaIosWallets`, `handleSolanaIosWalletCallback`), wallet-standard helpers (`adaptSolanaStandardWallet`, `getRegisteredSolanaWallets`), `withTimeout/withSolanaTimeout`, `normalizeSolanaError`; add `@vue-solana/core/mobile-wallet-support` to the subpath list (`packages/core/package.json:68-71` exports it, README omits it). Generate the table or extend `export-map-docs.test.ts` to cover this README.
- [x] Sync nuxt README auto-imports (`packages/nuxt/README.md:105-134` omits `useSolanaTransaction()`, `useSolanaRequestSwr()`, `useSolanaSubscriptionSwr()`, `useSolanaTrackedDataSwr()` though `src/imports.ts:31,38-40` and the CHANGELOG advertise them). Add the four rows to bullet list + table.
- [x] Sync vue README API table (`packages/vue/README.md:591-630`): document `tryUseSolana()` vs `useSolana()` SSR behavior and `MissingClientCapabilityError`.
- [x] Surface the SWR SSR warning in docs (`packages/vue/src/swr.ts:31-34` comment only). Add the per-request namespacing / `clearSwrCache()` note to the vue + nuxt READMEs.
- [x] Docs correctly warn options must be JSON-serializable (`packages/nuxt/README.md:78-80`) but nothing enforces it. Add a dev-only serializability assertion or a test snapshotting that `mobileWallet` (`packages/core/src/mobile-wallet.ts:18-22`) and iOS options (`packages/core/src/ios-wallet/types.ts:9-14`) stay serializable.

Acceptance criteria:

- No README claims an extra planner/executor plugin on the default client.
- Every exported subpath and auto-import appears in its README table, or a test fails.

## Phase 7: Targeted Test Coverage — P2

Status: planned.

Tasks:

- [ ] `src/clusters.ts`: `getWebSocketEndpoint("not-a-url")` throw case (no test today).
- [ ] `src/address.ts`: object/non-string input (`123 as any`, `{}`) — null vs throw.
- [ ] `src/token-accounts.ts`: malformed `tokenAmount.amount` / `state`.
- [ ] `src/ios-wallet/storage.ts`: corrupt `sessionStorage` JSON / bad `bs58` payload.
- [ ] `src/transaction.ts`: abort/cancellation path (timeout test uses fake timers; no abort test).
- [ ] `packages/vue/src/composables/usePayer.ts:22-37,45-68`: client object swapped after setup (capability re-check exists in `client-action.ts:67-69` but untested here).
- [ ] `packages/vue/src/composables/useSignAndSendTransaction.ts:46-64`: superseded `execute()` (executionId guard) and `signature` retention on confirm-timeout, matching README claims.
- [ ] `packages/nuxt/src/module.test.ts`, `src/runtime/plugin.test.ts`: `publicConfig.solana` non-object input (`module.ts:67`), `resolveVueDist()` fallback to bare `@vue-solana/vue/*` in live `setup()`, `runtimeConfig.public.solana === undefined` in the runtime plugin.
- [ ] Extend `packages/vue/src/kit-mirror.test.ts` pattern: assert `useIdentity`/`usePayer` subpaths export the same symbols.

Acceptance criteria:

- One new case per file above; all green under `pnpm test`.

## Phase 8: Verification And Release Readiness

Status: planned.

Tasks:

- [ ] Run `pnpm format`.
- [ ] Run `pnpm lint`.
- [ ] Run `pnpm test` (gates `locale-docs.test.ts`, export-map tests, new parity tests).
- [ ] Run `pnpm typecheck` (includes `pnpm --filter docs typecheck` per repo policy).
- [ ] Run `pnpm build:packages`.
- [ ] Run `pnpm build:examples`.
- [ ] Run `pnpm --filter docs build`.
- [ ] Run `pnpm smoke:standalone-installs` (gate for any `exports`-map change).
- [ ] Run `pnpm test:e2e` (mocks) and, when touching RPC/polling paths, `pnpm test:e2e:integration` (real devnet, `E2E_REAL_RPC=true`).
- [ ] Load `/demo` and confirm no `Buffer is not defined` when touching `sideEffects`, Buffer injection, or barrel boundaries.
- [ ] Add changesets for new public APIs and dropped/renamed exports (note: a `major` changeset `.changeset/bundle-size-trim.md` is already pending for 4.0.0 — core root drops `Buffer`/`installSolanaBufferPolyfill`, tarballs exclude `.d.mts`; coordinate, do not duplicate).

Acceptance criteria:

- All CI gates pass as listed in `Verification Status`.
- Changesets cover every breaking export change.

## Suggested Implementation Order

1. Phase 1: Critical Correctness.
2. Phase 2: Core Input Validation And Error Handling.
3. Phase 3: DX And API Consistency.
4. Phase 4: Bundle And Performance.
5. Phase 5: Maintainability And Tooling.
6. Phase 6: Documentation Accuracy.
7. Phase 7: Targeted Test Coverage.
8. Phase 8: Verification And Release Readiness.

Phases 6 and 7 can run in parallel once Phases 1–2 land, since they are mostly additive.

## Open Decisions

- Decide whether `commitment` belongs in core client config (wire it into `buildSolanaClient`) or stays plugin-only (split `SolanaClientConfig` vs plugin config).
- Decide the `MissingClientCapabilityError` hierarchy: subclass core `SolanaError` vs document the `instanceof` split.
- Decide `useConnection()` internal removal vs keeping the deprecated proxy path for one more major.
- Decide SWR eviction policy: per-key delete only, size cap, TTL, or LRU.
- Decide `buffer` packaging: `optionalDependencies` vs subpath-only peer.
- Decide whether the iOS adapter lazy-load is worth the async cascade, given the `tweetnacl` deferral above stays out of scope.
