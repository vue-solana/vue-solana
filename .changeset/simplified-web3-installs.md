---
"@vue-solana/core": patch
"@vue-solana/vue": patch
"@vue-solana/nuxt": patch
---

Simplify consumer installs by keeping low-level Solana and Buffer dependencies behind Vue Solana packages. `@vue-solana/core` now owns the public `@vue-solana/core/web3` and `@vue-solana/core/buffer-polyfill` surfaces, while Vue and Nuxt consumers no longer need to install `@solana/web3-compat` or `buffer` directly.
