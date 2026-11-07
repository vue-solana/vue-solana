---
"@vue-solana/core": patch
"@vue-solana/vue": patch
"@vue-solana/nuxt": patch
---

Reject an Android Mobile Wallet Adapter signing request when the wallet drops its authorization, instead of leaving it pending forever. When a wallet such as Phantom rejected the saved auth token, MWA cleared its session and never settled the request, so `signMessage` (and the transaction signing calls) spun with no prompt and no error. They now fail with `WALLET_NOT_CONNECTED`, and connecting again authorizes afresh.
