---
"@vue-solana/core": minor
"@vue-solana/vue": minor
"@vue-solana/nuxt": minor
---

Add `@solana/kit` client support as the first step of the Kit migration (transition release).

- `createSolanaClient()` from `@vue-solana/core/kit`, building a read-only Kit client (`rpc`, `rpcSubscriptions`) from the same `SolanaConfig`.
- New `@vue-solana/*/kit` subpaths re-exporting Kit primitives: `address`, `lamports`, and `Address`, `Rpc`, `SolanaRpcApi`, `SolanaClient` types.
- `useSolanaClient()` composable (returns `{ client, rpc }`), available from `@vue-solana/vue/useSolanaClient` and auto-imported by the Nuxt module.
- `SolanaContext` now carries the Kit `client` alongside the legacy `connection`; `SolanaWallet` now exposes an optional Kit `address`.
- Legacy helpers (`createSolanaConnection`, `signAndSendTransaction`, `confirmTransactionSignature`, token helpers, `parsePublicKey`, `web3` subpaths) are marked `@deprecated` but remain fully functional.
- Nuxt module adds Vite `optimizeDeps.include` entries for the Kit packages.
