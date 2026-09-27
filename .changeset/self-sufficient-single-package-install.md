---
"@vue-solana/core": minor
"@vue-solana/vue": minor
"@vue-solana/nuxt": minor
---

Make each package self-sufficient to install: adding `@vue-solana/nuxt` or `@vue-solana/vue` now pulls in everything an app needs, with no separate `@vue-solana/core`, `@vue-solana/vue`, or `@solana/kit` install. The dependency chain already did this — `@solana/kit` and `@solana/kit-plugin-rpc` are real dependencies of `@vue-solana/core`, and each package depends on the one below it. What was missing was a reachable public surface: a Nuxt or Vue app that needed a Kit symbol the curated re-export list happened to omit had no way to reach it except by depending on `@solana/kit` directly, which breaks under pnpm's strict `node_modules`.

Widen the `@vue-solana/core/kit` re-export list to cover the Kit symbols apps actually consume, and add the `AccountRole` and `Instruction` types. `@vue-solana/vue/kit` now re-exports `@vue-solana/core/kit` wholesale, and `@vue-solana/nuxt/kit` re-exports `@vue-solana/vue/kit` wholesale, so the surface can only be added in one place instead of drifting across three curated lists.

The core list stays explicit on purpose. A wildcard `export * from "@solana/kit"` in `@vue-solana/core` would make `SolanaError`, `isSolanaError`, and `isAbortError` ambiguous against this package's own `errors` and `action` modules, and the root barrel would silently drop all three.

`@vue-solana/vue` now re-exports the core domain types, so `SolanaWalletInfo` and friends are reachable from the package root instead of only from `@vue-solana/core/types`. `@vue-solana/nuxt` re-exports the public types from its own root entry, so a Nuxt app can name `SolanaWalletInfo`, `VueSolanaContext`, and the composable return types without a direct dependency on `@vue-solana/vue` or `@vue-solana/core`. The Nuxt root re-export is types-only on purpose: a value re-export would pull the build-time Nuxt module into the client bundle.

The Nuxt module also auto-imports everything else an app used to have to import by subpath. Add `useSolanaTransaction()` (the `useTransaction()` alias) alongside the three SWR adapters `useSolanaRequestSwr()`, `useSolanaSubscriptionSwr()`, and `useSolanaTrackedDataSwr()`. Auto-import `createSolanaPlugin`, `solanaInjectionKey`, `selectedWalletAccountInjectionKey`, and `createSelectedWalletAccountContext` for apps that set `solana.clientPlugin: false` to install a client-only `payer`, which module options cannot carry.

No composable signatures or client behavior changed. Apps that already installed `@vue-solana/core` or `@vue-solana/vue` directly to reach a deep import can drop those dependencies once they are on this version.
