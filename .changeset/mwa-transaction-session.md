---
"@vue-solana/core": patch
"@vue-solana/vue": patch
"@vue-solana/nuxt": patch
---

Sign and send transactions on the Android Mobile Wallet Adapter through the same recovering session as message signing. Phantom on Android Chrome rejects the saved MWA authorization before every signing request, so `signTransaction`, `signTransactions`, `signAllTransactions`, `signAndSendTransaction`, and `signAndSendTransactions` failed with `WALLET_NOT_CONNECTED`. They now fall back to a fresh authorization in the same wallet visit, and a batch is signed (or signed and sent) in one visit. The wallets guide documents the extra "approve this app" screen Phantom shows before every signing prompt.
