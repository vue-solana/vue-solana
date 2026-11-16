---
"@vue-solana/core": minor
"@vue-solana/vue": minor
"@vue-solana/nuxt": minor
---

Add wallet account signer adapters, so a connected wallet account can be passed anywhere Kit expects a signer.

- `useWalletAccountMessageSigner(account)` returns a `MessageModifyingSigner`, `useWalletAccountTransactionSigner(account, chain)` returns a `TransactionModifyingSigner`, and `useWalletAccountTransactionSendingSigner(account, chain)` returns a `TransactionSendingSigner` that signs and submits through the wallet. All three are exported from `@vue-solana/vue`, have their own subpaths (`@vue-solana/vue/useWalletAccountMessageSigner`, …), and are auto-imported by the Nuxt module as `useSolanaWalletAccount*Signer()`.
- The account is either the account object from `useWallets()` / `useSelectedWalletAccount()` or its address, optionally in a ref or getter. The signer's `address` is reactive, so a single signer created in `setup()` follows an account switch.
- The message and transaction signers promise the _modifying_ interfaces on purpose: a wallet may rewrite a message or transaction before signing it. They handle one item per request and reject a batch with `WALLET_FEATURE_UNSUPPORTED` instead of opening one wallet prompt per item. The sending signer uses the wallet's batch request when available and otherwise sends singular requests in sequence, throwing `PartialSignAndSendError` with the signatures that already landed when a fallback send fails.
- `chain` must be a Solana chain identifier (`solana:mainnet`, `solana:devnet`, …) and is validated when the signer is created. Signing goes through the connected wallet, so no wallet reports `NO_WALLET_SELECTED`, a disconnected wallet reports `WALLET_NOT_CONNECTED`, and a different connected account reports `INVALID_INPUT`.

The `@vue-solana/vue` README also gained the depth it was missing on the SWR adapters (key-based cache, per-attempt `getAbortSignal`, why there is no action adapter) and on the selected wallet account context (`filterWallet`, `stateSync`, and the `${walletName}:${accountAddress}` persistence key).
