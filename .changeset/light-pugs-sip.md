---
"@vue-solana/core": minor
"@vue-solana/vue": minor
"@vue-solana/nuxt": minor
---

Derive the `payerSecretKey` signer with Kit instead of tweetnacl, and declare all three packages side-effect free.

`resolvePayerFromSecretKey` no longer imports `tweetnacl`. It decodes the address synchronously from the public half and imports the key lazily inside `signTransactions`, via Kit's `createKeyPairFromBytes` and `signBytes`. `createKeyPairSignerFromBytes` was not usable directly: it returns a `Promise`, and `createSolanaClient` is synchronous.

Because WebCrypto is async, the secret/public consistency check moves from `createSolanaClient` to the first `signTransactions` call. The error is the same, but it now rejects instead of throwing eagerly. The base64 decode and the 64-byte length check stay synchronous and still throw at client creation. This drops about 33 KB (`nacl-fast.js`) from every consumer of `usePayer`, `useIdentity`, `usePlanTransaction`, `useSendTransaction`, and `createSolanaPlugin`.

`tweetnacl` remains a dependency: `ios-wallet/crypto.ts` still needs `nacl.box.before` for ECDH, so the `VITE_OPTIMIZE_DEPS` and `VITE_NEEDS_INTEROP` entries in the Nuxt module are unchanged.

Also add `"sideEffects": false` to all three packages. Nothing runs at import time in `buffer-polyfill.ts`, `mobile-wallet.ts`, or the Vue plugin, and every documented Buffer import binds a named export and calls it, so tree-shaking stays correct. Consumers should keep importing the Buffer helper as a named import rather than a bare side-effect import.

Dedupe `@solana/kit` to a single version. `@solana-mobile/wallet-standard-mobile` pulls `@solana-mobile/mobile-wallet-adapter-protocol@2.2.9`, which declares `@solana/kit: ^6.0.0`, so the workspace carried both kit 8.3.0 and kit 6.9.0 and two copies of `@solana/errors`. A root `pnpm.overrides` entry forces one kit. The MWA protocol only imports `getBase58Decoder`, `getBase58Encoder`, `getBase64Decoder`, `getBase64Encoder`, `getUtf8Encoder`, and `getUtf8Decoder` from `@solana/kit`, all of which are present and unchanged in 8.3.0, so this is safe. An override is a repo-install setting: it is not published and does not change the published dependency ranges, so package self-sufficiency is unaffected.
