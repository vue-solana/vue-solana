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

## New: `plugin.dispose()`

`createSolanaPlugin()` now returns `dispose()`, which stops the Wallet Standard
subscription started by `install`. Vue has no plugin unmount hook, so without it
the subscription outlives the app that created it.

```ts
const solana = createSolanaPlugin();
createApp(App).use(solana);
// app teardown:
solana.dispose();
```

Safe to call more than once and before `install`. The Nuxt runtime plugin wires
it to `vueApp.onUnmount()` automatically; in plain Vue call it after
`app.unmount()`.

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
