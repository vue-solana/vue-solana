---
"@vue-solana/core": minor
"@vue-solana/vue": minor
"@vue-solana/nuxt": minor
---

Add read-only token portfolio helpers. `@vue-solana/core/token-portfolio` aggregates classic SPL token accounts by mint with resolved decimals, UI amounts, totals, and unresolved-mint reporting; `@vue-solana/core/token-portfolio-2022` provides an opt-in Token-2022 entry point. `useTokenPortfolio()` and the Nuxt alias `useSolanaTokenPortfolio()` expose the reactive view with owner watching, refresh, abort-on-supersede, and optional slot invalidation.
