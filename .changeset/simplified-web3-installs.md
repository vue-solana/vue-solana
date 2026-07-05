---
"@vue-solana/core": patch
"@vue-solana/vue": patch
"@vue-solana/nuxt": patch
---

Simplify consumer installs by keeping low-level Solana and Buffer dependencies behind Vue Solana packages. `@vue-solana/core` owns the public `@vue-solana/core/web3` and `@vue-solana/core/buffer-polyfill` surfaces, while `@vue-solana/vue` and `@vue-solana/nuxt` now expose their own `web3` and `buffer-polyfill` subpaths so framework consumers do not need direct `@vue-solana/core`, `@solana/web3-compat`, or `buffer` installs for primary transaction examples.

`@vue-solana/core` also publishes package-owned declaration shims for `@solana/web3-compat` and the `buffer/` subpath so fresh TypeScript consumers can import the core package, `@vue-solana/core/web3`, and `@vue-solana/core/buffer-polyfill` without adding local shims.

Point the Nuxt package root declaration metadata at the generated ESM declaration so standalone TypeScript consumers can default-import the module from the package root.
