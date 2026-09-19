---
"@vue-solana/core": minor
"@vue-solana/vue": minor
"@vue-solana/nuxt": minor
---

Add React-parity data, wallet, and transaction composables.

- `useAction()` / `createSolanaActionStore()` (`@vue-solana/core/action`) with abortable, reactive action state, plus `useRequest()`, `useSubscription()`, and `useTrackedData()` for SWR reads, live streams, and slot-deduplicated RPC data.
- Sign In With Solana: `useSignIn()` composable and wallet-standard `signIn` support (`SolanaSignInFeature`, adapter `signIn`).
- Wallet selection: `useSelectedWalletAccount()` plus the `SelectedWalletAccountProvider` component, with localStorage persistence, cross-tab sync, and a Nuxt runtime plugin that installs the context app-wide.
- Batch transactions: `useSignTransactions()` and `useSignAndSendTransactions()` with the wallet's batch capability and fallbacks; a partial batch send rejects with `PartialSignAndSendError` carrying the signatures that were already submitted.
- `useClientCapability()`, `usePayer()` / `useIdentity()`, and `usePlanTransaction()` / `usePlanTransactions()`.
- SWR cache adapters (`@vue-solana/vue/swr`): `useRequestSwr()`, `useSubscriptionSwr()`, `useTrackedDataSwr()`, `clearSwrCache()`.
- Nuxt: all composables auto-imported as `useSolana*` (see the Nuxt docs for the full list).
