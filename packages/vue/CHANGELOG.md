# @vue-solana/vue

## 4.0.0-rc.1

### Patch Changes

- Release candidate refresh.
- Updated dependencies
  - @vue-solana/core@4.0.0-rc.1

## 4.0.0-rc.0

### Major Changes

- 8046470: Stop shipping the Node `buffer` polyfill in every consumer's initial chunk, and
  stop shipping duplicate declaration files.

  ## Breaking: `Buffer` is no longer re-exported from the `@vue-solana/core` root barrel

  `@vue-solana/core`'s root barrel did `export * from "./buffer-polyfill"`, which
  re-exports `Buffer` from the browser `buffer/` subpath. That module has
  module-level side effects, so no bundler could drop it — meaning every app that
  imported anything from `@vue-solana/core` paid for the whole polyfill up front:

  ```txt
  import { createSolanaClient } from "@vue-solana/core"
    144.5 KB -> 117.5 KB minified   (-27.0 KB, -18.7%)
  ```

  `@vue-solana/core/kit` was already 117.5 KB, which is exactly what the root
  barrel now costs — the delta was 100% buffer.

  **Fix your imports** if you used the root barrel. The documented, tree-shakeable
  path is unchanged:

  ```diff
  - import { Buffer, installSolanaBufferPolyfill } from "@vue-solana/core";
  + import { Buffer, installSolanaBufferPolyfill } from "@vue-solana/core/buffer-polyfill";
  ```

  `@vue-solana/vue/buffer-polyfill` and `@vue-solana/nuxt/buffer-polyfill` are
  unaffected and still mirror the same two names. Nothing in the docs, the example
  apps, or this repo's own source used the root-barrel form, so the removal is a
  no-op for every documented usage.

  ## Breaking: `ios-wallet` and `mobile-wallet` are no longer re-exported from the `@vue-solana/core` root barrel

  Same class of trim: the root barrel re-exported both modules, so a bare
  `import { createSolanaClient } from "@vue-solana/core"` paid for `tweetnacl`
  (~32 KB via `ios-wallet/crypto.ts`) and `@solana-mobile/wallet-standard-mobile`
  (~98 KB with its protocol graph) up front.

  **Fix your imports** if you used the root barrel. The documented subpaths are
  unchanged:

  ```diff
  - import { getSolanaIosWallets } from "@vue-solana/core";
  + import { getSolanaIosWallets } from "@vue-solana/core/ios-wallet";
  - import { registerSolanaMobileWallet } from "@vue-solana/core";
  + import { registerSolanaMobileWallet } from "@vue-solana/core/mobile-wallet";
  ```

  The dependency-free `isSolanaMobileWalletSupported()` gate stays available
  through `@vue-solana/core/mobile-wallet-support`.

  ## Smaller tarballs

  unbuild writes both a `.d.ts` and a byte-identical `.d.mts` for every entry
  point when `declaration: true`. Nothing resolves to the `.d.mts` — every
  `exports` condition points at `.d.ts`, including `@vue-solana/nuxt`'s root,
  which is repointed from `module.d.mts` to the identical `module.d.ts` sitting
  next to it (the package is `"type": "module"`, so a `.d.ts` is already ESM).
  All three now exclude the `.d.mts` files:

  | Package            | Before             | After              |
  | ------------------ | ------------------ | ------------------ |
  | `@vue-solana/core` | 123 KB / 59 files  | 97 KB / 41 files   |
  | `@vue-solana/vue`  | 282 KB / 149 files | 200 KB / 111 files |
  | `@vue-solana/nuxt` | 32 KB / 15 files   | 32 KB / 11 files   |

  Unpacked sizes, gzip/cjk excluded. No API, type, or resolution change.

  ## Breaking: `useSignatureStatus` no longer takes a `commitment` option

  `getSignatureStatuses` accepts no commitment parameter, so the option never did
  anything — it was documentation pretending to be configuration. Reads use the
  commitment baked into the RPC endpoint.

  ```diff
  - useSignatureStatus(signature, { commitment: "confirmed" })
  + useSignatureStatus(signature)
  ```

  For a per-call commitment, pass `{ commitment }` to `confirm(signature, opts)`
  from `useTransactionConfirmation()`, or call `confirmTransactionSignature()`
  directly from `@vue-solana/core`.

  Polling semantics also changed: ticks run on a chained `setTimeout` that never
  overlaps a slow RPC, same-signature concurrent `refresh()` calls join the
  in-flight request, and cleanup moved from `onUnmounted` to `onScopeDispose`
  (covering SSR and manual effect scopes). A signature change clears a manual
  `stopPolling()` and restarts polling for the new signature.

  ## Fixed: `commitment` is now honored

  `createSolanaClient()` / `createSolanaPlugin()` / Nuxt `solana.commitment`
  was documented as the default commitment for RPC calls but silently ignored —
  Kit pins `confirmed` unless the RPC stack is built with it. A configured
  `commitment` now builds an explicit RPC stack carrying it; when unset, the
  stock `solanaRpc()` path (and Kit's own defaults) is kept. Apps that set
  `commitment` will now actually send it.

  ## Nuxt runtime plugin forwards unknown public config fields

  The runtime plugin forwards everything in `public.solana` except the
  client-only/build-time keys (`wallet`, `payer`, `payerSecretKey`,
  `clientPlugin`), and tolerates a missing `public.solana` (falls back to
  defaults instead of throwing on `.cluster` access). Future options just work;
  the contract is covered by secret-strip / future-field / missing-config tests.

  Precedence is now explicit per key: a module option wins, then a hand-written
  `runtimeConfig.public.solana` value, then the module default. Previously the
  defaults were spread over the public config, so setting
  `runtimeConfig.public.solana.cluster` (without an equivalent module option) was
  silently overwritten by the `devnet` default.

  ## Fixed: `useSolana()` SSR fallback is per-call, not a singleton

  The uninjected fallback was a module-scoped object whose `wallet` / `status` /
  `wallets` refs would be shared across concurrent SSR requests, leaking one
  user's wallet state into another's render. It is now a fresh inert context per
  call.

  ## New: `plugin.dispose()`

  `createSolanaPlugin()` now returns `dispose()`, which stops the Wallet Standard
  subscription started by `install`. Vue has no plugin unmount hook, so without it
  the subscription outlives the app that created it.

  ```ts
  const solana = createSolanaPlugin();
  createApp(App).use(solana);
  // app teardown:
  app.unmount();
  solana.dispose();
  ```

  Safe to call more than once and before `install`. The Nuxt runtime plugin wires
  it to `vueApp.onUnmount()` automatically; in plain Vue call it after
  `app.unmount()`. After `dispose()`, `refreshWallets()` is a no-op so a late
  resolving mobile-wallet import cannot resurrect the subscription. A connected
  wallet stays connected — `dispose()` stops the subscription and the deferred
  bootstrap only.

  ## Breaking: airdrop failures are typed errors

  `useAirdrop()` failures are now `SolanaError`s with code `RPC_FAILURE` (the
  original error kept as `cause`) instead of plain `Error`s, and a client swapped
  in after setup without the `airdrop` capability throws
  `MissingClientCapabilityError` instead of an opaque RPC failure.

  ## Breaking: `useClientAction` runs on `useExecution`

  `useClientAction()` (and everything built on it) now shares the
  `useExecution` state machine: errors are normalized to `RPC_FAILURE`
  `SolanaError`s, and a scope teardown mid-flight no longer lets the in-flight
  call overwrite the settled state. `status` / `loading` / `error` / `data` keep
  their names and shapes; `data` is a `ShallowRef` again after a brief widening.

  ## `bs58` is no longer a runtime dependency

  Signature encoding now goes through Kit's `getBase58Encoder()`, so `bs58` is
  removed from the runtime dependencies of `@vue-solana/core` (and from
  `@vue-solana/vue` devDependencies, where only tests used it). Apps that import
  `bs58` directly should add it to their own `package.json`.

  ## `buffer` is now an optional peer dependency

  The `buffer` package is only needed by the `@vue-solana/core/buffer-polyfill`
  subpath. It is now an optional peer dependency rather than a hard dependency or
  optional dependency, so consumers that do not serialize transactions no longer
  pull it transitively. Apps that use `buffer-polyfill` must install `buffer`
  themselves.

  ## Lean imports and bundle budget

  `@vue-solana/core`'s root barrel keeps re-exporting the full `@solana/kit`
  mirror (~117 KB), while `address`, `errors`, `timeout`, `clusters`, and
  `types` stay free of iOS/mobile-wallet edges. The repository enforces that via
  `pnpm size:packages` (run in CI and release workflows). Prefer these subpaths
  when bundle size matters.

  ## Nuxt optimize-deps no longer defeats the mobile-wallet lazy split

  The Nuxt module no longer pre-bundles `@solana-mobile/wallet-standard-mobile`
  or `bs58`, and drops the `tweetnacl/nacl-fast.js` alias chain. Dev
  pre-bundling now respects the lazy mobile-wallet import.

  ## New: `deleteSwrKey()` and four more Nuxt auto-imports

  `@vue-solana/vue/swr` gains `deleteSwrKey(key)`, which evicts a single cached
  key instead of `clearSwrCache()`'s all-or-nothing wipe. The cache is capped at
  1024 entries with oldest-first eviction, so a long-lived app that cycles many
  query keys can drop the keys it knows are stale deterministically rather than
  waiting for the cap to push them out:

  ```ts
  import { deleteSwrKey } from "@vue-solana/vue/swr";

  // Key includes the adapter prefix (`request:` / `subscription:` / `tracked:`).
  deleteSwrKey("request:balance");
  ```

  The Nuxt module auto-imports four names it previously omitted:

  | Auto-import                   | Vue source              |
  | ----------------------------- | ----------------------- |
  | `useSolanaClientCapability()` | `useClientCapability()` |
  | `tryUseSolana()`              | `tryUseSolana()`        |
  | `clearSwrCache()`             | `clearSwrCache()`       |
  | `deleteSwrKey()`              | `deleteSwrKey()`        |

  `tryUseSolana()` returns the context or `undefined` outside a provider (the
  SSR-safe counterpart of `useSolana()`, which throws), and
  `useSolanaClientCapability()` fails fast with a `SolanaError` when the active
  client is missing a capability a composable needs.

  Core input validation and error handling also lands in this release.

  ## Breaking: confirmation failures have distinct error codes

  `confirmTransactionSignature()` previously reported a failed transaction and a
  missing signature both as `RPC_FAILURE` (the missing case even started life as a
  raw `Error` before normalization). They are now distinct:
  - Transaction errored before reaching the requested commitment →
    `TRANSACTION_FAILED` (was `RPC_FAILURE`), with the on-chain error kept as
    `cause`.
  - Signature never appeared in `getSignatureStatuses` results before the deadline
    → `TRANSACTION_NOT_FOUND` (was `RPC_FAILURE`).
  - Polls exhausted with a sighted-but-unconfirmed status → `TRANSACTION_TIMEOUT`
    (unchanged).

  ```diff
  - if (error.code === "RPC_FAILURE") { /* failed OR missing OR timed out */ }
  + switch (error.code) {
  +   case "TRANSACTION_FAILED": /* on-chain error in error.cause */ break;
  +   case "TRANSACTION_NOT_FOUND": /* never landed; safe to retry */ break;
  +   case "TRANSACTION_TIMEOUT": /* check status before retrying */ break;
  + }
  ```

  `useTransactionConfirmation()` / `useSignAndSendTransaction()` surface the new
  codes unchanged.

  ## Breaking: `parseAddress()` throws for non-string, non-ref input

  Numbers, booleans, plain objects, and arrays previously fell through to
  `value.value` and silently returned `null` (skipping the read). They now throw
  `INVALID_ADDRESS` like every other malformed input. `null` / `undefined` / `""`
  still mean absent and return `null`; getters and `{ value }` refs now unwrap
  recursively (the `MaybeAddressInput` type widened to match).

  ## `confirmTransactionSignature()` is cancellable and interval-configurable

  New `ConfirmTransactionOptions` fields (all optional): `pollIntervalMs` (default
  1500, must be greater than `0` — `0` would poll with no delay and hammer the
  RPC for the whole timeout), `abortSignal` (rejects with the abort reason
  instead of polling on), and `searchTransactionHistory` (forwarded to
  `getSignatureStatuses`, default `false`). Note `getSignatureStatuses` takes no
  commitment parameter — the commitment check stays client-side, as before.
  A signature older than the recent-status cache never appears in results, so
  confirming one without `searchTransactionHistory: true` resolves to
  `TRANSACTION_NOT_FOUND` after the timeout.

  ## `waitForRedirect()` no longer hangs forever

  The iOS deep-link wait only ever settled via page reload, so an in-page `await`
  hung indefinitely. It now rejects with `REDIRECT_TIMEOUT` after `timeoutMs`
  (default 10 minutes, matching the pending-request TTL) or when the optional
  `signal` aborts — letting callers reset `connecting` state. It still never
  resolves in-page; settlement via reload + `handleSolanaIosWalletCallback()` is
  unchanged.

  ## New: adapted wallets expose `dispose()`

  `adaptSolanaStandardWallet()` returns `AdaptedSolanaWallet` with a `dispose()`
  that releases the Wallet Standard `change` subscription captured at adapt time
  (idempotent; the wallet stays connected). `SolanaWallet` gains an optional
  `dispose?: () => void`, and the Vue wallet registry adds
  `disposeAllAdaptedWallets()` — it runs from plugin teardown so adapted wallets
  never outlive the app.

  ## Stricter validation elsewhere
  - `getWebSocketEndpoint("not-a-url")` throws `INVALID_INPUT` instead of a raw
    `TypeError`.
  - `withTimeout()` throws `INVALID_INPUT` for `NaN`/negative timeouts, accepts an
    options bag (`{ signal, code, message }`) with or without an error factory, and
    rejects with the abort reason when the caller's `signal` fires first.
  - Token-account parsing validates `mint` / `owner` / `tokenAmount.amount` /
    `tokenAmount.decimals` / `state` / `isNative` and throws `RPC_FAILURE` naming
    the malformed fields instead of a raw `BigInt()` throw.
  - Corrupt iOS sessions whose stored public key fails base58 decoding are purged
    and reported as absent instead of throwing raw.
  - `isSolanaError()` falls back to a structural check (`name` + string `code`) so
    it survives duplicate package copies; Kit's own `SolanaError` (numeric `code`)
    is not misclassified.
  - `STORAGE_FAILURE` is documented as the shared cross-package code: core defines
    it, `@vue-solana/vue`'s selected-wallet persistence throws it (core stays
    DOM-free and never throws it itself).

  Also fixed in this release: `scripts/smoke-standalone-installs.mjs` wrote
  transitive `@vue-solana/*` pins into the consumer `package.json`
  `pnpm.overrides` key, which pnpm 10 no longer reads — the vue/nuxt consumers
  were silently resolving `@vue-solana/core` (and `vue`) from the npm registry
  instead of the packed tarballs, and the install blocked on pnpm 10 build-script
  approval under `CI=1`. Overrides now go into a consumer `pnpm-workspace.yaml`
  with `dangerouslyAllowAllBuilds: true`.

  ## Other user-visible changes in this release
  - `MissingClientCapabilityError` now extends `SolanaError` (code
    `MISSING_CLIENT_CAPABILITY`) instead of `Error`, so capability failures answer
    `isSolanaError()`. `isSolanaError()`'s structural fallback also accepts
    `MissingClientCapabilityError` and `PartialSignAndSendError`.
  - `isAbortError` is deprecated in favor of `isSolanaActionAborted`
    (`isAbortError` remains as a deprecated alias).
  - `SolanaWallet.signAllTransactions` is deprecated in favor of
    `signTransactions` (same signature; the latter is tried first).
  - New export `unregisterSolanaMobileWallet()` resets the local deduplication
    guard used by `registerSolanaMobileWallet()`. It cannot unregister an MWA
    wallet already installed into the host registry (upstream provides no
    unregister API); intended for test/HMR reset only.
  - `GetSolanaIosWalletsOptions.appIdentity` was removed — it was never read.

  Verify `signMessage` and `signIn` wallet results against the account's public key
  before resolving.

  A Wallet Standard wallet can return a signature over different bytes than the
  message it was handed, or a signature made by a different key than the account it
  reported. The adapter now checks both before `signMessage()` / `signIn()` resolve
  and rejects a mismatch with a new `SolanaError` code, `INVALID_SIGNATURE` (a
  malformed signature is reported with the same code).

  ```ts
  import { useSignMessage } from "@vue-solana/vue/useSignMessage";

  const { execute, error } = useSignMessage();
  await execute(message);

  if (error.value?.code === "INVALID_SIGNATURE") {
    // The wallet's signature did not match the account or the signed bytes.
  }
  ```

  Details:
  - The check uses Kit 8.5's `verifySignature()` and runs against the account's
    **public key bytes**, so it makes no assumption about the address matching the
    key (custom adapters can report whichever address they like).
  - It is best-effort and degrades gracefully: where Ed25519 is unavailable in the
    WebCrypto API (older Safari, insecure contexts, non-browser runtimes), the key
    import fails and the result resolves unverified rather than rejecting a wallet
    the user already approved.
  - It only covers message signing and SIWS. Transaction signatures are not
    verified client-side; Kit does not verify those either.
  - **Server-side verification is still mandatory.** This is a client-side
    defense-in-depth guard against a misbehaving wallet, not an authentication
    boundary.

  Bump `@solana/kit` to `^8.5.0` (the workspace override moves with it, so the
  workspace still resolves a single copy — two copies mean two `SolanaError`
  classes, and `isSolanaError()` from one rejects errors thrown by the other).

  8.5.0 is additive for this package: the new wallet error codes
  (`SOLANA_ERROR__WALLET__INVALID_MESSAGE_SIGNATURE`,
  `SOLANA_ERROR__WALLET__INVALID_SIGN_IN_OUTPUT`,
  `SOLANA_ERROR__WALLET__INVALID_NUMBER_OF_OUTPUTS`) reach consumers through the
  `kit` subpaths, `getAddressEncoder()` / `getAddressCodec()` now also accept any
  address-bearing object (`HasAddress`), and the codec, sysvar, fixed-point and
  plugin-interface fixes land through the re-exported surface. The stricter
  `verifySignature()` now backs the new client-side `signMessage` / `signIn`
  check. The `@solana/wallet-account-signer` package is still not used here —
  `SolanaWallet` deals in raw signature bytes, so its signer wrapper does not fit.

  Nothing changes for wallets and environments that already return a correct
  signature, and no new dependency is added.

### Patch Changes

- Updated dependencies [8046470]
  - @vue-solana/core@4.0.0-rc.0

## 3.0.1

### Patch Changes

- 58951c0: Harden iOS wallet crypto (structured SolanaError codes, input validation, safer decoding), add mobile wallet support detection helper, and minor build/doc updates for mobile wallet support.
- Updated dependencies [58951c0]
  - @vue-solana/core@3.0.1

## 3.0.0

### Major Changes

- e014159: refactor!: publish ESM only and deduplicate the composable state machines
  - **ESM only:** drop `emitCJS` and every `require` export condition. Remove top-level `main`. This is a breaking change for CommonJS consumers; ESM remains the same.
  - **State machine dedup:** add private helpers `useAddressRead`, `useExecution`, and `client-action` to extract the duplicated logic across read composables, wallet actions, and client-capability actions.
  - **`useRequest` test env constraint:** the shared read helper does not use `useRequest` because Kit's `createReactiveActionStore` touches Node's `AbortSignal` internals and fails in jsdom/happy-dom; the local helper preserves existing behavior and test coverage.
  - **swc/swr + useTrackedData:** replace the hand-rolled `ReactiveActionSource` with Kit's `createReactiveActionStore`, collapse `swr` cache wrappers into `useSwrKeyed`, and trim disposables.
  - **package size:** 1.61 MB → 980 KB (-43%). Dependencies removed: `@vitest/coverage-v8`, `vue-router` (example), `@nuxt/image`, `@nuxtjs/mdc`.
  - **Full Kit mirror:** `@vue-solana/core/kit`, `@vue-solana/vue/kit` and `@vue-solana/nuxt/kit` now `export *` from `@solana/kit` (bumped to `^8.4.0`) instead of a curated list, so every Kit value and type is available without depending on `@solana/kit` yourself. The root barrels of `@vue-solana/core` and `@vue-solana/vue` keep `@vue-solana/core`'s own `SolanaError`, `SolanaErrorCode`, `isSolanaError` and `TransactionStatus`, so `instanceof SolanaError` still matches every error these composables throw; the Kit originals stay reachable through the `kit` subpaths.
  - **Read composables (`useBalance`, `useAccountInfo`, `useProgramAccounts`, `useTokenAccounts`, `useTokenBalance`):** now share `useAddressRead`, which changes three things:
    - `refresh()` returns `null` on an empty input instead of an empty value (`[]` for the list hooks), and **rethrows** a normalized `SolanaError` instead of resolving.
    - `data` resets to its empty value when a read fails. Previously the last successful value stayed visible after an error.
    - `useTokenBalance`'s `balance` and `decimals` are now `ComputedRef`s, so they are read-only. Read them; do not assign.
    - A malformed address passed to `useAccountInfo` now surfaces as an `INVALID_ADDRESS` `SolanaError` in `error` instead of resolving silently to `null`.
  - **`useSubscription` / `useTrackedData` teardown:** re-opening a connection (including a same-source `reconnect()` and a `useTrackedData` `refresh()`) now tears the previous one down first. Subscriptions are no longer orphaned, and `useTrackedData` no longer leaves an abandoned subscription window open.

### Patch Changes

- Updated dependencies [e014159]
  - @vue-solana/core@3.0.0

## 2.6.1

### Patch Changes

- 1456821: Report the real reason `payerSecretKey` signing failed, instead of blaming a malformed key.

  `signTransactions` remapped _every_ rejection from Kit's lazy key import to the "invalid `payerSecretKey`" error. That was too broad: an unavailable `crypto.subtle` — which is what a browser outside a secure context gives you — is not a malformed key, and the message actively sent people looking for a corrupt secret key. Only `PUBLIC_KEY_MUST_MATCH_PRIVATE_KEY` is remapped now. Every other error, including `SolanaError` codes from Kit, reaches the caller unchanged, and a missing `crypto.subtle` raises an error that names the secure-context requirement.

  `signTransactions` also honors `config.abortSignal` before signing. It was accepted and ignored, so an aborted transaction still signed. The abort is checked once, up front, not per transaction, so a batch is not torn in half partway through.

  `payer.address` is derived from the unverified public half, because the consistency check needs WebCrypto and cannot run inside the synchronous `createSolanaClient`. A keypair whose public half does not match its seed therefore reports an address that no signature will ever match; the mismatch surfaces on the first `signTransactions` call, which rejects. Treat `payer.address` as unconfirmed until a signature succeeds.

- Updated dependencies [1456821]
  - @vue-solana/core@2.6.1

## 2.6.0

### Minor Changes

- 2ee43a8: Derive the `payerSecretKey` signer with Kit instead of tweetnacl, and declare all three packages side-effect free.

  `resolvePayerFromSecretKey` no longer imports `tweetnacl`. It decodes the address synchronously from the public half and imports the key lazily inside `signTransactions`, via Kit's `createKeyPairFromBytes` and `signBytes`. `createKeyPairSignerFromBytes` was not usable directly: it returns a `Promise`, and `createSolanaClient` is synchronous.

  Because WebCrypto is async, the secret/public consistency check moves from `createSolanaClient` to the first `signTransactions` call. The error is the same, but it now rejects instead of throwing eagerly. The base64 decode and the 64-byte length check stay synchronous and still throw at client creation. This drops about 33 KB (`nacl-fast.js`) from every consumer of `usePayer`, `useIdentity`, `usePlanTransaction`, `useSendTransaction`, and `createSolanaPlugin`.

  `tweetnacl` remains a dependency: `ios-wallet/crypto.ts` still needs `nacl.box.before` for ECDH, so the `VITE_OPTIMIZE_DEPS` and `VITE_NEEDS_INTEROP` entries in the Nuxt module are unchanged.

  Also add `"sideEffects": false` to all three packages. Nothing runs at import time in `buffer-polyfill.ts`, `mobile-wallet.ts`, or the Vue plugin, and every documented Buffer import binds a named export and calls it, so tree-shaking stays correct. Consumers should keep importing the Buffer helper as a named import rather than a bare side-effect import.

  Dedupe `@solana/kit` to a single version. `@solana-mobile/wallet-standard-mobile` pulls `@solana-mobile/mobile-wallet-adapter-protocol@2.2.9`, which declares `@solana/kit: ^6.0.0`, so the workspace carried both kit 8.3.0 and kit 6.9.0 and two copies of `@solana/errors`. A root `pnpm.overrides` entry forces one kit. The MWA protocol only imports `getBase58Decoder`, `getBase58Encoder`, `getBase64Decoder`, `getBase64Encoder`, `getUtf8Encoder`, and `getUtf8Decoder` from `@solana/kit`, all of which are present and unchanged in 8.3.0, so this is safe. An override is a repo-install setting: it is not published and does not change the published dependency ranges, so package self-sufficiency is unaffected.

### Patch Changes

- Updated dependencies [2ee43a8]
  - @vue-solana/core@2.6.0

## 2.5.0

### Minor Changes

- 92dbe1b: Make each package self-sufficient to install: adding `@vue-solana/nuxt` or `@vue-solana/vue` now pulls in everything an app needs, with no separate `@vue-solana/core`, `@vue-solana/vue`, or `@solana/kit` install. The dependency chain already did this — `@solana/kit` and `@solana/kit-plugin-rpc` are real dependencies of `@vue-solana/core`, and each package depends on the one below it. What was missing was a reachable public surface: a Nuxt or Vue app that needed a Kit symbol the curated re-export list happened to omit had no way to reach it except by depending on `@solana/kit` directly, which breaks under pnpm's strict `node_modules`.

  Widen the `@vue-solana/core/kit` re-export list to cover the Kit symbols apps actually consume, and add the `AccountRole` and `Instruction` types. `@vue-solana/vue/kit` now re-exports `@vue-solana/core/kit` wholesale, and `@vue-solana/nuxt/kit` re-exports `@vue-solana/vue/kit` wholesale, so the surface can only be added in one place instead of drifting across three curated lists.

  The core list stays explicit on purpose. A wildcard `export * from "@solana/kit"` in `@vue-solana/core` would make `SolanaError`, `isSolanaError`, and `isAbortError` ambiguous against this package's own `errors` and `action` modules, and the root barrel would silently drop all three.

  `@vue-solana/vue` now re-exports the core domain types, so `SolanaWalletInfo` and friends are reachable from the package root instead of only from `@vue-solana/core/types`. `@vue-solana/nuxt` re-exports the public types from its own root entry, so a Nuxt app can name `SolanaWalletInfo`, `VueSolanaContext`, and the composable return types without a direct dependency on `@vue-solana/vue` or `@vue-solana/core`. The Nuxt root re-export is types-only on purpose: a value re-export would pull the build-time Nuxt module into the client bundle.

  The Nuxt module also auto-imports everything else an app used to have to import by subpath. Add `useSolanaTransaction()` (the `useTransaction()` alias) alongside the three SWR adapters `useSolanaRequestSwr()`, `useSolanaSubscriptionSwr()`, and `useSolanaTrackedDataSwr()`. Auto-import `createSolanaPlugin`, `solanaInjectionKey`, `selectedWalletAccountInjectionKey`, and `createSelectedWalletAccountContext` for apps that set `solana.clientPlugin: false` to install a client-only `payer`, which module options cannot carry. Those four are registered for that opt-out only, so `createSolanaPlugin` — and with it the ability to construct a client from a `payerSecretKey` — is not in global scope for apps that let the module install the plugin.

  Make the module point the app's auto-imports at the copy of `@vue-solana/vue` it resolved for itself. Nuxt writes a relative specifier into the app's generated `imports.d.ts`, and a relative specifier bypasses the package `exports` map — so `@vue-solana/vue/swr` resolved to `<package root>/swr`, which is not a file because the build output lives under `dist`. The miss landed inside a `.d.ts`, which `skipLibCheck` swallowed, and every composable silently degraded to `any` in the app instead of erroring. The app still installs one package.

  Widen `SolanaTransaction` to Kit's `ReadonlyUint8Array`. It was `Uint8Array`, which rejected the output of `getTransactionEncoder().encode()` — the encoder the docs tell you to use. `Uint8Array` is still assignable to it, so existing code is unaffected.

  No composable signatures or client behavior changed. Apps that already installed `@vue-solana/core` or `@vue-solana/vue` directly to reach a deep import can drop those dependencies once they are on this version.

### Patch Changes

- Updated dependencies [92dbe1b]
  - @vue-solana/core@2.5.0

## 2.4.0

### Minor Changes

- 150cf15: Compose the official Kit transaction stack by default in `createSolanaClient()`: `solanaRpc()`, `rpcTransactionPlanner()`, and `rpcTransactionPlanSendingExecutor()` from `@solana/kit-plugin-rpc`. The old custom transaction-sending fallback is removed. The default client now exposes `planTransaction(s)` and `sendTransaction(s)` through Kit's official planner and RPC executor; the executor handles blockhashes, resource limits, preflight simulation, signing, submission, and send-and-confirm at `confirmed` commitment.

  Keep `payer` and `payerSecretKey` as direct core/Vue client configuration. `payer` accepts a Kit `TransactionSigner`; `payerSecretKey` is a base64-encoded 64-byte Ed25519 keypair (secret key first) resolved at client creation. Nuxt `ModuleOptions` intentionally omits both fields and strips them from public runtime config. Never place a raw secret or funded key in browser-visible Nuxt config; use a trusted server/relayer boundary or a client-only ephemeral signer for demos.

  Accept `mainnet` as Solana's official mainnet cluster name while retaining `mainnet-beta` as a legacy alias. Both spellings resolve to the same public HTTP and WebSocket endpoints (`https://api.mainnet.solana.com`, `wss://api.mainnet.solana.com`), so Explorer links and endpoint handling treat either spelling as mainnet.

  `useSendTransaction()`, `useSendTransactions()`, `usePlanTransaction()`, and `usePlanTransactions()` now require a `payer`. Calling one of them with a payer-less client throws a `MissingClientCapabilityError` naming `payer` at setup time, instead of failing deep inside Kit with `Cannot read properties of undefined (reading 'address')` later, when a transaction is sent. A payer-less client no longer exposes a phantom `payer: undefined` own key, so `'payer' in client` reports the truth, and `useClientCapability()` treats a `null` capability as missing.

  This is a behavior change for clients that sent a transaction message carrying its own embedded signer without configuring a `payer`: those clients now have to expose a `payer` too. Kit reads `client.payer` to set the fee payer, so there is no way to plan or send without one.

  Add the Nuxt module option `solana.clientPlugin` (`false` skips the module's runtime plugin). Use it when the app installs `createSolanaPlugin` itself to attach a client-only `payer`; installing both creates two Solana contexts, two wallet subscriptions, and two connection checks.

  The module also strips `payer` and `payerSecretKey` from a hand-written `runtimeConfig.public.solana`, not just from its own options, so a secret can no longer reach the client bundle by that route.

### Patch Changes

- Updated dependencies [150cf15]
  - @vue-solana/core@2.4.0

## 2.3.0

### Minor Changes

- 556600d: Add `useSendTransaction()` / `useSendTransactions()` for sending transactions through the client's transaction-sending capability (`ClientWithTransactionSending`), with no wallet popup: flexible input (instructions, plans, or transaction messages), abort-aware cancellation, and supersede handling — starting a new `execute()` aborts the previous call and discards its state.

  Both composables surface `status` (idle, sending, sent, error), `loading`, `error`, and `data`. `useSendTransactions()` sends one or more transactions, executed in parallel or sequentially as the plan dictates.

  `usePlanTransaction()` / `usePlanTransactions()` now also abort in-flight planner calls when superseded or when the owning component unmounts.

  Expose `useSolanaSendTransaction()` and `useSolanaSendTransactions()` via the Nuxt module, and export the underlying sending plan types (`SingleTransactionPlan`, `TransactionPlanInput`, `TransactionPlanResult`, `SuccessfulSingleTransactionPlanResult`, `ClientWithTransactionSending`) from `@vue-solana/core`.

### Patch Changes

- Updated dependencies [556600d]
  - @vue-solana/core@2.3.0

## 2.2.0

### Minor Changes

- c09065f: Add `useAirdrop()` for test-network funding: dispatch an airdrop to an address with abort-aware cancellation, resolve `data` to the transaction `Signature` (or `undefined` when the network applies the airdrop without a transaction), and translate common faucet rate-limit errors (HTTP 429 / generic internal JSON-RPC error) into an actionable message.

  Add per-attempt/per-connection cancellation to the reactive data composables:
  - `getAbortSignal` option on `useRequest`, `useSubscription`, and `useTrackedData`, invoked per attempt/connection and reset between attempts to reflect latest state.
  - `refresh({ abortSignal })` / `reconnect({ abortSignal })` per-call overrides that take precedence over the factory; passing no arguments keeps the factory behavior.

  Install the `rpcAirdrop()` capability on the core Solana client so airdrops work out of the box on devnet and local validators, and expose `useSolanaAirdrop()` via the Nuxt module.

### Patch Changes

- Updated dependencies [c09065f]
  - @vue-solana/core@2.2.0

## 2.1.0

### Minor Changes

- c8e883c: Add React-parity data, wallet, and transaction composables.
  - `useAction()` / `createSolanaActionStore()` (`@vue-solana/core/action`) with abortable, reactive action state, plus `useRequest()`, `useSubscription()`, and `useTrackedData()` for SWR reads, live streams, and slot-deduplicated RPC data.
  - Sign In With Solana: `useSignIn()` composable and wallet-standard `signIn` support (`SolanaSignInFeature`, adapter `signIn`).
  - Wallet selection: `useSelectedWalletAccount()` plus the `SelectedWalletAccountProvider` component, with localStorage persistence, cross-tab sync, and a Nuxt runtime plugin that installs the context app-wide.
  - Batch transactions: `useSignTransactions()` and `useSignAndSendTransactions()` with the wallet's batch capability and fallbacks; a partial batch send rejects with `PartialSignAndSendError` carrying the signatures that were already submitted.
  - `useClientCapability()`, `usePayer()` / `useIdentity()`, and `usePlanTransaction()` / `usePlanTransactions()`.
  - SWR cache adapters (`@vue-solana/vue/swr`): `useRequestSwr()`, `useSubscriptionSwr()`, `useTrackedDataSwr()`, `clearSwrCache()`.
  - Nuxt: all composables auto-imported as `useSolana*` (see the Nuxt docs for the full list).

### Patch Changes

- Updated dependencies [c8e883c]
  - @vue-solana/core@2.1.0

## 2.0.0

### Major Changes

- 99ee109: v2.0.0: Kit-only — remove the `@solana/web3-compat` bridge and the `web3` subpaths.

  `SolanaContext.connection` is gone; the context exposes `client` (`createSolanaClient`) only. `SolanaWallet.publicKey` is now `Address | null`. `SolanaTransaction` is raw serialized wire bytes (`Uint8Array`). RPC reads return `bigint` lamports and `Uint8Array` account data. `useConnection()` is kept as a deprecated alias returning the Kit client. The Nuxt module no longer injects web3-compat `optimizeDeps` entries. See the `guides/kit-migration` page for the full migration map, including how to install `@solana/kit-plugin-signer` signer/airdrop helpers directly for agent/script contexts.

### Patch Changes

- Updated dependencies [99ee109]
  - @vue-solana/core@2.0.0

## 1.2.0

### Minor Changes

- 93aee6d: Add `@solana/kit` client support as the first step of the Kit migration (transition release).
  - `createSolanaClient()` from `@vue-solana/core/kit`, building a read-only Kit client (`rpc`, `rpcSubscriptions`) from the same `SolanaConfig`.
  - New `@vue-solana/*/kit` subpaths re-exporting Kit primitives: `address`, `lamports`, and `Address`, `Rpc`, `SolanaRpcApi`, `SolanaClient` types.
  - `useSolanaClient()` composable (returns `{ client, rpc }`), available from `@vue-solana/vue/useSolanaClient` and auto-imported by the Nuxt module.
  - `SolanaContext` now carries the Kit `client` alongside the legacy `connection`; `SolanaWallet` now exposes an optional Kit `address`.
  - Legacy helpers (`createSolanaConnection`, `signAndSendTransaction`, `confirmTransactionSignature`, token helpers, `parsePublicKey`, `web3` subpaths) are marked `@deprecated` but remain fully functional.
  - Nuxt module adds Vite `optimizeDeps.include` entries for the Kit packages.

### Patch Changes

- Updated dependencies [93aee6d]
  - @vue-solana/core@1.2.0

## 1.1.0

### Minor Changes

- e04ae33: Add SPL token account helpers and composables: `useTokenAccounts`, `useTokenBalance`, token account query functions, and `@solana/spl-token` re-exports.

### Patch Changes

- Updated dependencies [e04ae33]
  - @vue-solana/core@1.1.0

## 1.0.0

### Major Changes

- 5564b3c: Release v1.0.0 of the vue-solana monorepo. Stabilized public API, wallet UX foundations, transaction lifecycle, reactive account data, message signing, and comprehensive error handling for Vue and Nuxt Solana integrations.

### Patch Changes

- Updated dependencies [5564b3c]
  - @vue-solana/core@1.0.0

## 0.8.3

### Patch Changes

- 25d5475: Simplify consumer installs by keeping low-level Solana and Buffer dependencies behind Vue Solana packages. `@vue-solana/core` owns the public `@vue-solana/core/web3` and `@vue-solana/core/buffer-polyfill` surfaces, while `@vue-solana/vue` and `@vue-solana/nuxt` now expose their own `web3` and `buffer-polyfill` subpaths so framework consumers do not need direct `@vue-solana/core`, `@solana/web3-compat`, or `buffer` installs for primary transaction examples.

  `@vue-solana/core` also publishes package-owned declaration shims for `@solana/web3-compat` and the `buffer/` subpath so fresh TypeScript consumers can import the core package, `@vue-solana/core/web3`, and `@vue-solana/core/buffer-polyfill` without adding local shims.

  Point the Nuxt package root declaration metadata at the generated ESM declaration so standalone TypeScript consumers can default-import the module from the package root.

- Updated dependencies [25d5475]
  - @vue-solana/core@0.7.2

## 0.8.2

### Patch Changes

- 16fd954: Improve package README structure for npm with badges, feature summaries, compatibility details, option tables, API tables, and caveats.
- Updated dependencies [16fd954]
  - @vue-solana/core@0.7.1

## 0.8.1

### Patch Changes

- 1308d50: Stabilize the Vue Solana injection key across root and subpath imports so duplicated package/module instances still resolve the provided Solana context.

## 0.8.0

### Minor Changes

- e77115b: Add normalized Solana errors with stable error codes and use them across core helpers and Vue composables.

### Patch Changes

- Updated dependencies [e77115b]
  - @vue-solana/core@0.7.0

## 0.7.0

### Minor Changes

- c060c45: Add wallet message signing support and expose wallet capability flags for Vue and Nuxt applications.

### Patch Changes

- Updated dependencies [c060c45]
  - @vue-solana/core@0.6.0

## 0.6.1

### Patch Changes

- 739a418: Harden reactive account and signature composables, document new public account-data APIs, and keep package export/build metadata aligned.
- Updated dependencies [739a418]
  - @vue-solana/core@0.5.1

## 0.6.0

### Minor Changes

- ed16ec2: Add transaction confirmation helpers, Vue confirmation state, and Nuxt auto-import support.

### Patch Changes

- Updated dependencies [ed16ec2]
  - @vue-solana/core@0.5.0

## 0.5.0

### Minor Changes

- 9809f38: Implement persisted wallet selection restore and opt-in `autoConnect` for previously selected wallets.

  Add optional timeout settings to `useTransaction()` with `timeoutMs` and `timeoutMessage`.

## 0.4.2

### Patch Changes

- 6e1f094: Harden native wallet callback handling and transaction signing result validation.

  Validate iOS wallet callback payloads, expire stale pending callback requests, clear consumed callback state on failures, and reject mismatched `signAllTransactions` results from iOS and Wallet Standard adapters. Also prevent stale balance refreshes from overwriting newer state and keep non-serializable Nuxt wallet instances out of public runtime config.

- Updated dependencies [6e1f094]
  - @vue-solana/core@0.4.2

## 0.4.1

### Patch Changes

- Updated dependencies [f099ba0]
  - @vue-solana/core@0.4.1

## 0.4.0

### Minor Changes

- 04a4626: Add iOS mobile wallet support through the unified wallet flow.

  The core package now exports iOS wallet helpers and related wallet metadata, while the Vue plugin and Nuxt module can configure and expose the mobile wallet flow alongside existing browser wallet support.

### Patch Changes

- Updated dependencies [04a4626]
  - @vue-solana/core@0.4.0

## 0.3.3

### Patch Changes

- 337b99f: Document the installable Vue Solana Agent Skill in the published package READMEs.
- Updated dependencies [337b99f]
  - @vue-solana/core@0.3.3

## 0.3.2

### Patch Changes

- 5244d3b: Improve mobile wallet transaction completion handling across core transaction helpers and Vue transaction composables.

  Replace the dynamic `@solana/web3-compat` import in `useBalance()` with a static `PublicKey` import to avoid ineffective dynamic import warnings in consuming Vite/Rollup apps.

- Updated dependencies [5244d3b]
  - @vue-solana/core@0.3.2

## 0.3.1

### Patch Changes

- e22b88f: Fix Nuxt dev-mode wallet discovery by optimizing Solana mobile wallet dependencies and lazy-loading mobile wallet registration.
- Updated dependencies [e22b88f]
  - @vue-solana/core@0.3.1

## 0.3.0

### Minor Changes

- b2bd905: Add Solana Mobile Wallet Adapter registration and expose wallet metadata for unified browser and mobile wallet discovery.

### Patch Changes

- Updated dependencies [b2bd905]
  - @vue-solana/core@0.3.0

## 0.2.3

### Patch Changes

- d8e0732: Preserve connected wallet state when switching or clearing wallet selection.

## 0.2.2

### Patch Changes

- 421b8bc: Avoid loading Solana RPC and wallet dependencies during Nuxt server rendering by registering the Nuxt runtime plugin as client-only and skipping the Vue plugin's automatic RPC check on the server.

## 0.2.1

### Patch Changes

- b0b6ed2: Add a timeout and stale-result guard for RPC connection checks so `useRpc()` and `useSolanaRpc()` cannot remain stuck in the `checking` state indefinitely.
- b0b6ed2: Update package README example links and documentation GitHub links to open in a new tab.
- Updated dependencies [b0b6ed2]
  - @vue-solana/core@0.2.1

## 0.2.0

### Minor Changes

- f3d4e80: add wallet adapter support

### Patch Changes

- Updated dependencies [f3d4e80]
  - @vue-solana/core@0.2.0

## 0.1.3

### Patch Changes

- 8eea9c3: Handle automatic balance refresh failures without creating unhandled promise rejections.

## 0.1.2

### Patch Changes

- c0446cc: Update package README files and homepage links.
- Updated dependencies [c0446cc]
  - @vue-solana/core@0.1.2
