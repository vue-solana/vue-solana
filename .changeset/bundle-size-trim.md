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

## `bs58` is no longer a runtime dependency of `@vue-solana/vue`

Signature encoding now goes through Kit's `getBase58Encoder()`, so `bs58`
moved to `devDependencies`. Apps that only used it via this package can drop it
from their own `package.json`.
