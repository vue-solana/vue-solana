---
"@vue-solana/vue": patch
"@vue-solana/nuxt": patch
---

Add a timeout and stale-result guard for RPC connection checks so `useRpc()` and `useSolanaRpc()` cannot remain stuck in the `checking` state indefinitely.
