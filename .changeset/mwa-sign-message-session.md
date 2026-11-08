---
"@vue-solana/core": patch
"@vue-solana/vue": patch
"@vue-solana/nuxt": patch
---

Sign messages on the Android Mobile Wallet Adapter in a session that recovers from a rejected auth token. Phantom on Android Chrome rejects the re-authorization MWA sends before every signing request, even right after connecting, so `signMessage` opened the wallet with no prompt and failed. A rejected token now falls back to a fresh authorization in the same wallet session, so Phantom asks to approve the app once more and then shows the signing prompt. When both fail, the error includes the wallet's own messages.
