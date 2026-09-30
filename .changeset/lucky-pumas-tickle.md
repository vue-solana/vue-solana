---
"@vue-solana/core": patch
"@vue-solana/vue": patch
"@vue-solana/nuxt": patch
---

Report the real reason `payerSecretKey` signing failed, instead of blaming a malformed key.

`signTransactions` remapped *every* rejection from Kit's lazy key import to the "invalid `payerSecretKey`" error. That was too broad: an unavailable `crypto.subtle` — which is what a browser outside a secure context gives you — is not a malformed key, and the message actively sent people looking for a corrupt secret key. Only `PUBLIC_KEY_MUST_MATCH_PRIVATE_KEY` is remapped now. Every other error, including `SolanaError` codes from Kit, reaches the caller unchanged, and a missing `crypto.subtle` raises an error that names the secure-context requirement.

`signTransactions` also honors `config.abortSignal` before signing. It was accepted and ignored, so an aborted transaction still signed. The abort is checked once, up front, not per transaction, so a batch is not torn in half partway through.

`payer.address` is derived from the unverified public half, because the consistency check needs WebCrypto and cannot run inside the synchronous `createSolanaClient`. A keypair whose public half does not match its seed therefore reports an address that no signature will ever match; the mismatch surfaces on the first `signTransactions` call, which rejects. Treat `payer.address` as unconfirmed until a signature succeeds.
