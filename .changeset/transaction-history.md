---
"@vue-solana/core": minor
"@vue-solana/vue": minor
"@vue-solana/nuxt": minor
---

Add read-only transaction history: `getTransactionHistory()` in core, `useTransactionHistory()` in Vue, and the `useSolanaTransactionHistory()` Nuxt auto-import. The API lists paginated signature metadata for an address without fetching parsed transaction bodies, and the composable handles reactive address changes, superseded requests, and scope disposal.
