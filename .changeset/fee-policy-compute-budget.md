---
"@vue-solana/core": minor
"@vue-solana/vue": minor
"@vue-solana/nuxt": minor
---

Add local fee and compute-budget policy: `resolveFeePolicy()` in core, `useComputeBudget()` / `useFeePolicy()` in Vue, and the `useSolanaComputeBudget()` Nuxt auto-import. The API applies fixed presets, local caps, and optional simulation-derived limits to a Kit message without signing or sending it, and reports the estimates behind the chosen budget.
