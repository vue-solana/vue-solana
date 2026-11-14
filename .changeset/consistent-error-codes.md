---
"@vue-solana/core": patch
"@vue-solana/vue": patch
"@vue-solana/nuxt": patch
---

Fix a Nuxt option-precedence bug, report the right error code for a few failures that were filed under the wrong one, and expose the iOS redirect wait helper that the 4.0.0 changelog already documented.

- `@vue-solana/nuxt` now lets an inline module option win over `runtimeConfig.public.solana` even when the inline value equals the module default. `modules: [["@vue-solana/nuxt", { cluster: "devnet" }]]` against a public `cluster: "mainnet"` used to be treated as "not set" and lose. `defineNuxtModule` no longer declares those defaults; `mergeSolanaSources()` applies them only for keys nothing else defined.
- `parseAddress()` now rejects a cyclic or absurdly nested ref/getter input with `INVALID_ADDRESS` instead of recursing until the stack overflows. The nesting budget is 32 levels, which no realistic `{ value }` chain or getter reaches.
- `useSignatureStatus()` sets `INVALID_INPUT` for a `pollIntervalMs` of `0` or less, matching the code core uses for malformed options, instead of reporting it as an `RPC_FAILURE`. A malformed signature still reports `RPC_FAILURE`; only the invalid option changed.
- `useSignMessage()`, `useSignIn()`, and `useSignTransactions()` normalize a generic wallet failure to `WALLET_FAILURE` instead of `RPC_FAILURE`. These composables only talk to the wallet, so a transport failure there was being presented to apps as a network error. Specific codes thrown before the wallet call (`NO_WALLET_SELECTED`, `WALLET_NOT_CONNECTED`, `WALLET_FEATURE_UNSUPPORTED`, `USER_REJECTED`, `INVALID_SIGNATURE`) are unchanged, and the sign-and-send pair keeps `RPC_FAILURE` because it does reach the network.
- `waitForRedirect()` and `WaitForRedirectOptions` are now exported from `@vue-solana/core/ios-wallet`. The function was public in name only: `CHANGELOG.md` (4.0.0) gave it a section describing its `timeoutMs` and `signal` options, but the barrel did not re-export it, so apps building a custom iOS deep-link flow could not import it.
