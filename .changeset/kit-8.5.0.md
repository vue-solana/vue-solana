---
"@vue-solana/core": patch
"@vue-solana/vue": patch
"@vue-solana/nuxt": patch
---

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
check (see the wallet-signature-verification changeset). The
`@solana/wallet-account-signer` package is still not used here — `SolanaWallet`
deals in raw signature bytes, so its signer wrapper does not fit.
