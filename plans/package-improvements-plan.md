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

- Async `tweetnacl` ECDH in `packages/core/src/ios-wallet/crypto.ts` (static `import * as naclModule` keeps ~32.9 KB in the eager chunk). The 2026-10-21 re-measure narrowed the synchronous constraint to the public `handleSolanaIosWalletCallback`, so this is no longer a separate blocker — it is the same change as the iOS adapter bullet below; see `plans/bundle-performance-followups.md` for the design and the `ponytail:` comment in `crypto.ts` for the constraint.
- iOS adapter lazy-load in the Vue plugin chunk (`packages/vue/src/plugin/wallet-registry.ts:1-7` statically imports `@vue-solana/core/ios-wallet`). Re-measured 2026-10-21 with esbuild against the built `exports` map: the eager chunk behind `import { createSolanaPlugin } from "@vue-solana/vue"` is 67.4 KB minified (excluding `vue` and the 117 KB Kit mirror), of which `tweetnacl/nacl-fast.js` is 32.9 KB and `ios-wallet/*` glue 12.2 KB — ~38.9 KB (58%) is removable. Still deferred, but the original blocker list was too pessimistic: `getSolanaIosWallets` and `createPendingRequest` do not need crypto to go async (their only dependency is `createRequestId`'s `nacl.randomBytes(16)`, replaceable with `crypto.getRandomValues`), and `launchConnect` is internal with a single caller inside `async connect()`. The one real constraint is the public synchronous `handleSolanaIosWalletCallback` (`packages/core/src/ios-wallet/callback.ts:15`). Non-breaking path when revisited: (1) WebCrypto request ids, (2) `await import()` of `deep-links`/`callback` inside the adapter's async methods, (3) a crypto-free `ios-wallet-discovery` core entry that `wallet-registry.ts` imports, (4) a gated dynamic import of the full entry for deep-link intake (`hasIosWalletCallbackParams`) plus a generation-guarded second `refreshWallets()` pass. `pnpm size:packages` now walks the vue eager graph, so this cannot grow silently; the iOS weight itself is reported, not capped.
- Desktop native wallets beyond the unified flow (`plans/native-wallet-plan.md` owns this).
- Solana Pay / QR work (`plans/solana-pay-qr-plan.md` owns this).
- TanStack Query adapter (already recorded as out of scope in `plans/react-readme-parity-plan.md`).

Phase 9 is outside the original audit scope: it records the post-`rc.0` review of the 4.0.0 branch (2026-10-21) and is tracked at the end of this file.

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

## [x] Phase 2: Core Input Validation And Error Handling — P0

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

## [x] Phase 3: DX And API Consistency — P1

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

## [x] Phase 4: Bundle And Performance — P1

Status: complete; the iOS adapter lazy-load item was evaluated and deferred — see `Deferred scope`.

Tasks:

- [x] Nuxt pre-bundles the lazy mobile wallet (`packages/nuxt/src/module.ts:26-38` `VITE_OPTIMIZE_DEPS` includes `@solana-mobile/wallet-standard-mobile`, but `packages/vue/src/plugin.ts:165` lazy-imports it ~98 KB Android-only). Drop the entry from `include`; prefer bare package names over `a > b > c` chains where Vite accepts them.
- [x] `tweetnacl/nacl-fast.js` rows may be dead (`packages/nuxt/src/module.ts:31-32,36-37`; core `packages/core/src/kit.ts:23-45` uses Kit `createKeyPairFromBytes`/`signBytes`, only bare `tweetnacl` remains for iOS ECDH). Verify with bundle grep, drop if unreferenced.
- [x] `bs58` duplicates Kit codecs (`packages/core/package.json:119`; 11 source files in `src/ios-wallet/*.ts` + `src/wallet-standard/adapter.ts`, while `src/kit.ts:6` already uses Kit `getBase58Encoder/getBase58Decoder`). Replace and drop the dep. Also drop `bs58` test-only devDep in vue (`packages/vue/src/composables/useSignatureStatus.test.ts:1` sole consumer) in favor of Kit codecs.
- [x] `buffer` is a hard dep for one subpath (`packages/core/package.json:120`, only `src/buffer-polyfill.ts:1` needs it). Move to `optionalDependencies` or document as subpath-only peer.
- [x] Vue plugin chunk carries iOS + wallet-standard statically (`packages/vue/src/plugin/wallet-registry.ts:1-13`; only `mobile-wallet` is lazy). Evaluated, not lazy-loaded: re-measured 2026-10-21 at ~38.9 KB of the 67.4 KB eager chunk (`tweetnacl` 32.9 KB + `ios-wallet/*` 12.2 KB, while the 99.8 KB mobile/qrcode chunk is correctly split). Deferred to the `Deferred scope` entry above, which now records the corrected blocker (only the synchronous `handleSolanaIosWalletCallback`). `scripts/check-lean-imports.mjs` walks the vue eager graph, so a new static heavy edge fails CI instead of relying on a manual measurement.
- [x] SWR module `Map` unbounded, all-or-nothing clear, sync-flush writes (`packages/vue/src/swr.ts:50,132-136`). Add per-key `deleteSwrKey()` / size cap (or document key hygiene); confirm `flush: "sync"` is intentional.
- [x] Vue build pins 8 GB (`packages/vue/package.json:181` `NODE_OPTIONS=--max-old-space-size=8192 unbuild`). Investigate the OOM (likely kit mirror decl) rather than pinning memory in the script. _(OOM reproduced without the pin; pin retained.)_
- [x] Document lean-import guidance: `import { … } from "@vue-solana/core/address|errors|timeout"` for size-sensitive entries (root is ~117 KB via the intentional kit mirror, `packages/core/src/kit-mirror.test.ts:28-31`); add a size-limit CI check so a Kit-heavy import into `address/errors/timeout/clusters` is caught. Same for vue root vs subpath chunks. (`scripts/check-lean-imports.mjs`, `pnpm size:packages`; core README updated. The same script now walks every `packages/vue/dist/*.mjs` static import graph, so root-vs-subpath drift and new heavy edges fail CI.)

Acceptance criteria:

- Dev pre-bundling no longer defeats the mobile-wallet lazy split.
- `bs58` / `nacl-fast.js` removals verified by bundle grep, not assumption.
- Size guards fail CI before a new heavy import lands in a lean entry.

## [x] Phase 5: Maintainability And Tooling — P2

Status: complete.

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
- [x] Nuxt `module.test.ts` never exercises real `defineNuxtModule` (`packages/nuxt/src/module.test.ts:5-14` mocks it as identity). Added `packages/nuxt/src/module.integration.test.ts`, which loads the real module through `@nuxt/kit`'s `loadNuxt` against `packages/nuxt/test/fixture` (no build, no dev server) and covers defaults, module-option/public-config merge, secret stripping, non-object `public.solana`, the default plugin install, and the `clientPlugin: false` branch (plugin skipped, setup values imported via the real `imports:extend` hook). The mocked `module.test.ts` stays for the fast per-branch checks.
- [x] `qrcode` ghost reference (`packages/nuxt/src/module.test.ts:177-201` fixture only). Rename fixture to a neutral name.
- [x] Root `vitest.config.ts` aliases only a subset of `@vue-solana/vue/*` subpaths. Replace enumerated aliases with a wildcard/filesystem-mapped alias or generate from `packages/vue/package.json` `exports`.
- [x] Document the 5th-colliding-name procedure (`packages/core/src/kit.ts:140-156`, resolved in `src/index.ts:30-32`, guarded by `src/kit-mirror.test.ts:13-15`): when Kit adds a colliding name, add it to the explicit re-export list + test. Documented as the `Colliding-name procedure` comment in `packages/core/src/index.ts:42-46` by `abf9bd6`; the explicit-reexport list it points at is guarded by `src/kit-mirror.test.ts`.

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

## [x] Phase 7: Targeted Test Coverage — P2

Status: implemented.

Tasks:

- [x] `src/clusters.ts`: `getWebSocketEndpoint("not-a-url")` throw case (no test today).
- [x] `src/address.ts`: object/non-string input (`123 as any`, `{}`) — null vs throw.
- [x] `src/token-accounts.ts`: malformed `tokenAmount.amount` / `state`.
- [x] `src/ios-wallet/storage.ts`: corrupt `sessionStorage` JSON / bad `bs58` payload.
- [x] `src/transaction.ts`: abort/cancellation path (timeout test uses fake timers; no abort test).
- [x] `packages/vue/src/composables/useSignAndSendTransaction.ts:46-64`: superseded `execute()` (executionId guard) and `signature` retention on confirm-timeout, matching README claims.
- [x] `packages/nuxt/src/module.test.ts`, `src/runtime/plugin.test.ts`: `publicConfig.solana` non-object input (`module.ts:67`) and `runtimeConfig.public.solana === undefined` in the runtime plugin.
- [x] Extend `packages/vue/src/kit-mirror.test.ts` pattern: assert `useIdentity`/`usePayer` subpaths export the same symbols.

Acceptance criteria:

- One new case per file above; all green under `pnpm test`.

## [x] Phase 8: Verification And Release Readiness

Status: complete (branch `release/v4.0.0`). All gates green: `format`, `lint`, `test` (71 files / 718 tests), `typecheck` (all six workspace projects incl. docs + examples), `build:packages`, `build:examples`, `docs build`, `smoke:standalone-installs` (core/vue/nuxt standalone consumers install + typecheck, exit 0), `test:e2e` 24/24, `test:e2e:integration` (real devnet) 14 passed / 10 mock-only skipped, `/demo` load clean.

Tasks:

- [x] Run `pnpm format`.
- [x] Run `pnpm lint`.
- [x] Run `pnpm test` (gates `locale-docs.test.ts`, export-map tests, new parity tests).
- [x] Run `pnpm typecheck` (includes `pnpm --filter docs typecheck` per repo policy).
- [x] Run `pnpm build:packages`.
- [x] Run `pnpm build:examples`.
- [x] Run `pnpm --filter docs build`.
- [x] Run `pnpm smoke:standalone-installs` (gate for any `exports`-map change). Slow (~4 min: it rebuilds packages, then installs + typechecks three fresh consumers); run it with a background shell rather than a short tool timeout.
- [x] Run `pnpm test:e2e` (mocks) and, when touching RPC/polling paths, `pnpm test:e2e:integration` (real devnet, `E2E_REAL_RPC=true`). Both run: the 4.0.0 changeset rewrites `useSignatureStatus` polling and the confirmation error codes, so the integration run was required. Mock-only specs self-skip under `E2E_REAL_RPC=true`.
- [x] Load `/demo` and confirm no `Buffer is not defined` when touching `sideEffects`, Buffer injection, or barrel boundaries. Served `apps/docs/.output/server/index.mjs` and drove Chromium over `/demo` and `/`: HTTP 200, `typeof globalThis.Buffer === "function"`, zero `pageerror`s. The only console noise is the Vercel Insights script 404 and sibling-route `_payload.json` prefetch 404s, both artifacts of a self-hosted preview, not app errors. Note `apps/docs` pins the published packages, so this validates the docs app wiring; the workspace-side barrel trim is covered by the smoke consumers and the example-app e2e.
- [x] Add changesets for new public APIs and dropped/renamed exports (note: a `major` changeset `.changeset/bundle-size-trim.md` is already pending for 4.0.0 — core root drops `Buffer`/`installSolanaBufferPolyfill`, tarballs exclude `.d.mts`; coordinate, do not duplicate). Audited by diffing the public export surface from the 3.0.1 release commit (`d97b585`) to HEAD. The existing changeset already covered everything except two items, which were appended to it rather than duplicated into a second file: `deleteSwrKey()` (new `@vue-solana/vue/swr` export, the single-key counterpart to `clearSwrCache()`) and the four new Nuxt auto-imports (`useSolanaClientCapability`, `tryUseSolana`, `clearSwrCache`, `deleteSwrKey`). `assertWalletSignature` needs no entry — it is internal, not re-exported from any core barrel.

Acceptance criteria:

- All CI gates pass as listed in `Verification Status`.
- Changesets cover every breaking export change.

## [ ] Phase 9: 4.0.0 Release Review Follow-Ups — P0

Status: open (2026-10-21). Source: full-branch review of `@vue-solana/core@3.0.1...HEAD` (142 files, 18 commits, `HEAD` = `1553c9e`) on `release/v4.0.0`. Every existing gate passes (`format`, `lint`, `test` 71 files / 718 tests, `typecheck` all six projects, `pack:size`, `check:entries`, `check:esm-map`, `check:externals`, `check:buffer-polyfill-declarations`, `size:packages`), so these are review-level defects, not build failures. Each unchecked item is intended to be its own change set. `4.0.0-rc.0` is already published, so behavior fixes ride the next candidate (`task rc:bump` → `4.0.0-rc.1`); fold their user-facing notes into `.changeset/bundle-size-trim.md` rather than opening a second changeset (pre mode does not consume it).

Tasks:

**P0 — correctness**

- [x] `confirmTransactionSignature()` ignores custom abort reasons. `packages/core/src/transaction.ts:150-156` only rethrows when `isAbortErrorLike()` sees `name === "AbortError"` (`transaction.ts:195-201`), but `wait()` rejects with `signal.reason` (`transaction.ts:186-189`) and `throwIfAborted()` throws it verbatim. `controller.abort(new Error("navigation"))` therefore surfaces as `RPC_FAILURE`, contradicting `packages/core/src/types.ts:173` (“rejects with the signal's reason”). Fix: in the catch, `if (abortSignal?.aborted) throw abortSignal.reason;` before the name check. Add the custom-reason regression test under P2 below. Resolved: implemented as `throw abortSignal.reason ?? cause` (the fallback keeps non-conforming signals that report `undefined` from rejecting with `undefined`), covered by `transaction.test.ts` “rejects with the caller-supplied abort reason”.
- [x] Wallet failure paths became silent. This branch replaced every diagnostic `console.error` with `void cause;`: mobile-wallet registration (`packages/vue/src/plugin.ts:178-180`), persisted-wallet auto-connect (`plugin.ts:218-220`), initial `refreshWallets()` (`plugin.ts:272-274`), and the iOS callback (`packages/vue/src/plugin/wallet-registry.ts:131-137`, i.e. decryption / deep-link errors). None sets `error.value` and none logs, while RPC and storage failures still do (`plugin.ts:103-110`, `133-135`). Keep the `console.info` removal, but restore observability: set `error.value = normalizeSolanaError(cause, ...)` where a context exists and add a dev-only `console.error` or injectable logger. The iOS callback is the highest-value path. Resolved: all four paths set `error.value` and log through `logDevError()` (dev-only, `[Vue Solana]` prefix). The code is `WALLET_FAILURE` (new, below) rather than `RPC_FAILURE`. The bootstrap now starts `checkConnection()` before `refreshWallets()`, because `checkConnection()` clears the shared `error` ref synchronously and used to wipe the refresh failure in the same task.

**P1 — security hardening and precedence**

- [ ] `signIn` verifies the wallet-returned account, not the active one. `packages/core/src/wallet-standard/adapter.ts:151-158` verifies `signInResult.account.publicKey`, while `signMessage` correctly verifies `getActiveAccount(account).publicKey` (`adapter.ts:175-180`). When `input` is omitted the default input is built from the active account (`adapter.ts:144`), so a wallet returning a different account it controls passes the client check. Server-side SIWS verification still gates trust, but this is an account-substitution hole and an inconsistency. Fix: when `input?.address` is absent, verify the active account; when present, require the returned account to match `input.address`; reject any returned account absent from `wallet.accounts`.
- [ ] Malformed signatures skip the length check when Ed25519 WebCrypto is unavailable. `packages/core/src/wallet-standard/verify-wallet-signature.ts:27-49` attempts `importKey` first and returns from the catch (line 38) before `isSignatureBytes(signature)` (line 44). On older Safari or an insecure context a wallet returning a 3-byte signature is accepted silently instead of throwing `INVALID_SIGNATURE`; the length check is crypto-independent. Fix: move the `isSignatureBytes` branch above the `importKey` try/catch. The existing fallback test (`packages/core/src/wallet-standard/adapter.test.ts:670`) uses a 64-byte signature, so it cannot catch this.
- [ ] Nuxt inline module options equal to a default lose to public config. `packages/nuxt/src/module.ts:147-173` detects an “untouched default” by comparing `options[key]` with `MODULE_DEFAULTS[key]` (`module.ts:54`) and checking `nuxt.options.solana`. Inline options (`modules: [["@vue-solana/nuxt", { cluster: "devnet" }]]`) never appear in `nuxt.options.solana`, so an explicit value equal to the default is treated as untouched and `runtimeConfig.public.solana.cluster` wins. The `solana` config-key path is covered (`packages/nuxt/src/module.integration.test.ts:102`); the inline path is not. Fix: apply per-key defaults only after the merge for every key where explicitness matters (`cluster`, `autoConnect`), so `undefined` means “not set”, and add the inline-options integration case.

**P2 — consistency, edge cases, tooling**

- [ ] `toAddressInput()` recursion has no cycle guard. `packages/core/src/address.ts:39-58` unwraps getters and `{ value }` refs recursively, so `const a = () => a` throws `RangeError: Maximum call stack size exceeded` instead of `INVALID_ADDRESS`. Add a depth limit (e.g. 32) and throw a `SolanaError` with `INVALID_ADDRESS` when exceeded.
- [ ] `useSignatureStatus` reports invalid input as `RPC_FAILURE`. `packages/vue/src/composables/useSignatureStatus.ts:146-147` uses `RPC_FAILURE` for `pollIntervalMs <= 0`, while core uses `INVALID_INPUT` for the same class (`packages/core/src/transaction.ts:89-94`, `timeout.ts`). Recommended: switch to `INVALID_INPUT` and update `apps/docs/content/packages/vue.md:840`, `knowledge-bundle/packages/vue.md:396`, and the three locale files in the same change set. This is a small behavior change, so record it in the changeset.
- [ ] Wallet-signing composables still report `RPC_FAILURE` for wallet-only failures. `useSignMessage`, `useSignIn`, and `useSignTransactions` share `useExecution`'s `RPC_FAILURE` fallback (`packages/vue/src/composables/use-execution.ts:65`), while `useWallet()` and the plugin boot paths now use `WALLET_FAILURE`. Parameterize the fallback code per composable (the sign-and-send composables mix wallet and RPC failures, so decide those separately) and update the tests that assert `RPC_FAILURE`.
- [ ] `Taskfile.yml` release-tool nits. `Taskfile.yml:102` and `:111` write `${{.RC_TAG}}`; Task renders `{{.RC_TAG}}` to `rc`, leaving the shell to expand an empty `$rc`, so the messages read `does not match the  tag` and `publishing : 4.0.0-rc.0`. Use `{{.RC_TAG}}` like line 113. Also `rc:finalize` (`Taskfile.yml:140-149`) deliberately runs outside pre mode, so running it on `main` consumes the pending changeset and cuts a final version; add a branch confirmation or precondition.

**Documentation**

- [ ] `MISSING_CLIENT_CAPABILITY` is undocumented. The code is new in this branch (`packages/core/src/errors.ts:19`, thrown by `packages/vue/src/composables/useClientCapability.ts:21`) but is missing from `apps/docs/content/guides/errors.md:29-42`, `apps/docs/content/packages/core.md:395-409`, `knowledge-bundle/packages/core.md:209+`, and the `es`/`ko`/`zh` copies of the two docs. Add the bullet plus a sentence in the client-capability section explaining hand-built clients. `INVALID_SIGNATURE` was added to all of these; this one was missed.
- [ ] `deleteSwrKey()` and the 1024-entry cache cap are only in the changeset. `packages/vue/src/swr.ts:50,66-79` add both, but `apps/docs/content/packages/vue.md` (SWR section, ~655-676), the three locale copies, and `knowledge-bundle/packages/vue.md` still describe `clearSwrCache()` as the only eviction tool. Document the full-key prefixes (`request:` / `subscription:` / `tracked:`) and oldest-first eviction.
- [ ] `apps/docs/content/packages/nuxt.md:106` says “the SWR adapters are not auto-imported. Import them explicitly from the Vue package subpath”, but `packages/nuxt/src/imports.ts:37-41` auto-imports `useSolanaRequestSwr`, `useSolanaSubscriptionSwr`, and `useSolanaTrackedDataSwr`. Pre-existing, but this release’s “four more Nuxt auto-imports” section makes it visible; fix in all locales.
- [ ] `.changeset/bundle-size-trim.md` structure. Line 220 has a dangling lead-in (“Core input validation and error handling also lands in this release.”) immediately before the next `##` heading. The wallet-signature verification feature starts at line 329 as a bare paragraph inside “Other user-visible changes in this release” (line 313) with no heading, even though it introduces `INVALID_SIGNATURE`; give it its own `##` section like every other feature.
- [ ] Stale “four colliding names” count. `AGENTS.md:128`, `packages/core/src/kit-mirror.test.ts:34`, and this plan’s own Design Principles section say four; `packages/core/src/index.ts:48-53` now also resolves `isAbortError`, so it is five (`SolanaError`, `isSolanaError`, `SolanaErrorCode`, `TransactionStatus`, `isAbortError`). Update all three.
- [ ] `waitForRedirect()` is documented as user-facing but unreachable. `.changeset/bundle-size-trim.md:268` gives it a `##` section describing caller-visible behavior and options, but `packages/core/src/ios-wallet.ts` does not re-export it (only `packages/core/src/ios-wallet/browser.ts:103`), and `@vue-solana/core` exposes only the `./ios-wallet` subpath. Either export `waitForRedirect` + `WaitForRedirectOptions` from the barrel and its docs, or reword the changeset to describe an internal fix.

**Tests**

- [ ] SWR eviction cap is untested. `packages/vue/src/swr.test.ts:252` covers `deleteSwrKey` only. Add a case that inserts 1025 entries and asserts the oldest is evicted, plus one that re-writes an existing key and asserts the insertion-order refresh in `packages/vue/src/swr.ts:104-111` keeps it alive.
- [ ] No test asserts a configured `commitment` reaches the wire. `packages/core/src/kit.test.ts:81-93` asserts only that the explicit stack is used and that `rpc`/`rpcSubscriptions` exist. Capture the transport request body and assert it contains `{"commitment":"processed"}`; that is the regression the explicit stack exists to prevent.
- [x] No test for a custom abort reason. `packages/core/src/transaction.test.ts:316` calls `controller.abort()` with no reason. Add `controller.abort(new Error("stop"))` and assert the rejection _is_ that error (covers the P0 fix). Resolved: “rejects with the caller-supplied abort reason” fails when the fix is reverted.
- [x] No test for wallet failure observability. `packages/vue/src/plugin/plugin.wallet-errors.test.ts` covers the bootstrap refresh failure surviving `checkConnection()`, the mobile-wallet registration failure, the auto-connect rejection, and the iOS callback (typed and untyped); `plugin.wallet-discovery.test.ts` asserts the registration failure code, and `useWallet.test.ts` covers the `WALLET_FAILURE` fallback plus clearing a stale wallet error on a successful connect.
- [x] No test for iOS callback error codes. `packages/core/src/ios-wallet/callback.test.ts` now asserts `INVALID_INPUT`, `REDIRECT_TIMEOUT`, `DECRYPTION_FAILED`, `WALLET_FAILURE`, and `USER_REJECTED` instead of message-only assertions.
- [ ] No test for inline-options-equal-default precedence. Add the `modules: [[module, { cluster: "devnet" }]]` + `runtimeConfig.public.solana.cluster = "mainnet"` case to `packages/nuxt/src/module.integration.test.ts` (covers the P1 fix). Include `autoConnect: true` vs `autoConnect: false` as the second key with the same shape.
- [ ] No test for a malformed signature when WebCrypto is unavailable. Extend `packages/core/src/wallet-standard/adapter.test.ts:670` (or add a sibling) that mocks `importKey` rejection _and_ returns a short signature, asserting `INVALID_SIGNATURE` (covers the P1 fix).
- [ ] No test for sign-in account substitution. Add a case to `packages/core/src/wallet-standard/adapter.test.ts` where the wallet returns a different account than the adapter’s active account, validly signing for itself, and assert rejection (covers the P1 fix).
- [ ] Misnamed test. `packages/core/src/clusters.test.ts:34` says “throws `INVALID_ADDRESS` for malformed endpoints” but asserts `INVALID_INPUT` at line 42; rename it to match the behavior.

Acceptance criteria:

- Every P0 and P1 item is closed with a regression test that fails before the fix.
- `pnpm format`, `pnpm lint`, `pnpm test`, `pnpm typecheck`, `pnpm build:packages`, and `pnpm pack:size` pass; run `pnpm test:e2e` when the confirmation/polling paths change (item 1 and the `useSignatureStatus` code change).
- Documentation changes land in the same change set as their code, and every English doc edit is mirrored into `es`/`ko`/`zh` so `packages/core/src/locale-docs.test.ts` stays green; structural changes use the same heading levels so the structure check keeps passing.
- User-facing fixes are appended to `.changeset/bundle-size-trim.md`; no second pending changeset is opened while pre mode is active.

## Suggested Implementation Order

1. Phase 1: Critical Correctness.
2. Phase 2: Core Input Validation And Error Handling.
3. Phase 3: DX And API Consistency.
4. Phase 4: Bundle And Performance.
5. Phase 5: Maintainability And Tooling.
6. Phase 6: Documentation Accuracy.
7. Phase 7: Targeted Test Coverage.
8. Phase 8: Verification And Release Readiness.
9. Phase 9: 4.0.0 Release Review Follow-Ups — land P0 first (one commit each), then P1 + their regression tests; documentation and tooling items can run in parallel with the P1 work.

Phases 6 and 7 can run in parallel once Phases 1–2 land, since they are mostly additive. Phase 9 is post-rc.0 work: every behavior fix needs `task rc:bump` (or another changeset) before the stable 4.0.0 cut.

## Open Decisions

- ~~Decide whether `commitment` belongs in core client config (wire it into `buildSolanaClient`) or stays plugin-only (split `SolanaClientConfig` vs plugin config).~~ Resolved in 4.0.0: core client config — `SolanaConfig.commitment` (`packages/core/src/types.ts:24`) flows through `createSolanaClient` → `buildSolanaClient` (`packages/core/src/kit.ts:123`), pinned by `kit.test.ts:73-85`. No `SolanaClientConfig` split.
- ~~Decide the `MissingClientCapabilityError` hierarchy: subclass core `SolanaError` vs document the `instanceof` split.~~ Resolved in 4.0.0: subclasses core `SolanaError` (code `MISSING_CLIENT_CAPABILITY`) in `packages/vue/src/composables/useClientCapability.ts:11`, and `isSolanaError()` name-matches it across duplicate copies (`packages/core/src/errors.ts:71`).
- `useConnection()` / `useSolanaConnection()` stays through 4.x: removal target 5.0.0. Deprecated since 2.0.0, but removing it now would churn both example apps, the package READMEs, and the four locale doc trees for no functional gain.
- ~~Decide SWR eviction policy: per-key delete only, size cap, TTL, or LRU.~~ Resolved in 4.0.0: per-key `deleteSwrKey()` plus a 1024-entry size cap with oldest-first eviction (`packages/vue/src/swr.ts`).
- ~~Decide `buffer` packaging: `optionalDependencies` vs subpath-only peer.~~ Resolved in 4.0.0: subpath-only optional peer — `peerDependencies.buffer` with `peerDependenciesMeta.buffer.optional = true` in `packages/core/package.json`.
- ~~Decide whether the iOS adapter lazy-load is worth the async cascade, given the `tweetnacl` deferral above stays out of scope.~~ Resolved for 4.0.0: deferred — measured cost and the synchronous blocker recorded in `Deferred scope`, now corrected by the 2026-10-21 re-measure (one real blocker, not four) and guarded by `pnpm size:packages`.
- ~~Decide whether composable `error` refs should pass a caller-supplied abort reason through unchanged.~~ Resolved for 4.0.0: no. They stay `SolanaError | null`, so an aborted `useTransactionConfirmation()` / `useSignAndSendTransaction()` confirmation reports `RPC_FAILURE` with the caller's reason on `error.cause`; documented in `apps/docs/content/packages/vue.md` and `knowledge-bundle/packages/vue.md`. Core callers of `confirmTransactionSignature()` still get the raw reason. Giving `error` refs a union type (`SolanaError | unknown`) is not worth it.
- ~~Decide which code wallet boot failures use.~~ Resolved for 4.0.0: new `WALLET_FAILURE` code (`packages/core/src/errors.ts`) instead of `RPC_FAILURE`, which the error docs reserve for RPC work. `useWallet()` connect/disconnect, mobile-wallet registration, persisted-wallet auto-connect, and iOS callback handling use it; `USER_REJECTED` still wins when the wallet reports a rejection.
