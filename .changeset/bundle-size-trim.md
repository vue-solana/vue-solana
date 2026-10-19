---
"@vue-solana/core": major
"@vue-solana/vue": major
"@vue-solana/nuxt": major
---

Stop shipping the Node `buffer` polyfill in every consumer's initial chunk, and
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
