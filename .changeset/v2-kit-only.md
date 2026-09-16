---
"@vue-solana/core": major
"@vue-solana/vue": major
"@vue-solana/nuxt": major
---

v2.0.0: Kit-only — remove the `@solana/web3-compat` bridge and the `web3` subpaths.

`SolanaContext.connection` is gone; the context exposes `client` (`createSolanaClient`) only. `SolanaWallet.publicKey` is now `Address | null`. `SolanaTransaction` is raw serialized wire bytes (`Uint8Array`). RPC reads return `bigint` lamports and `Uint8Array` account data. `useConnection()` is kept as a deprecated alias returning the Kit client. The Nuxt module no longer injects web3-compat `optimizeDeps` entries. See the `guides/kit-migration` page for the full migration map, including how to install `@solana/kit-plugin-signer` signer/airdrop helpers directly for agent/script contexts.
