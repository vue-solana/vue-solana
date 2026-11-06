---
"@vue-solana/core": patch
"@vue-solana/vue": patch
"@vue-solana/nuxt": patch
---

Fix the Android Mobile Wallet Adapter (Phantom and other MWA wallets):

- `signMessage` no longer fails with `INVALID_SIGNATURE`. MWA returns the message with the signature appended as `signedMessage`; the adapter now verifies against, and returns, the signed message bytes.
- `signIn` works while connected. MWA answered from its cached authorization without opening the wallet and threw "no sign in result"; the adapter now clears that authorization first, and a disconnected MWA wallet can sign in with the domain alone (which also connects it).
- `signAndSendTransactions` with more than one transaction signs the whole batch in one wallet session and sends through the app RPC, instead of launching the wallet once per transaction (the later launches had no user gesture and failed with "wallet not found"). A failed send throws `PartialSignAndSendError` with the signatures already sent; the class now lives in `@vue-solana/core/errors` and is still exported from `@vue-solana/vue`.
- Auto-connect uses a silent connect (`wallet.connect({ silent: true })`), so a page load never prompts or launches a wallet app; with nothing to restore the wallet stays disconnected.
- A wallet the user left connected is restored after a page refresh even without `autoConnect`. The selected-wallet entry in `localStorage` records `connected: true` while connected (cleared by `disconnect()`), and on load the restored wallet is reconnected silently. Previously the UI showed it as disconnected although the wallet still trusted the site. The iOS deep-link adapter now honours `silent` and never launches the wallet for it.
- The MWA authorization cache is scoped to the registered chains, so an authorization for another network is dropped instead of reused.
