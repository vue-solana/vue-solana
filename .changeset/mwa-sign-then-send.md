---
"@vue-solana/core": patch
"@vue-solana/vue": patch
"@vue-solana/nuxt": patch
---

Fix payments through Android Mobile Wallet Adapter never reaching Phantom's approval prompt. Sign-and-send now has the wallet sign the transaction in this package's own MWA session and submits it through the app's RPC, instead of MWA's `sign_and_send_transactions` request, which Phantom never answered.
