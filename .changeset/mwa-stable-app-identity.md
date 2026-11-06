---
"@vue-solana/core": patch
"@vue-solana/vue": patch
"@vue-solana/nuxt": patch
---

Keep the default Android Mobile Wallet Adapter app identity stable across pages. It was named after `document.title`, which changes per route and locale, and MWA wallets re-check the identity before every signing request, so a restored session could reach Phantom under a different name and open with no prompt. The name now comes from `<meta name="application-name">`, then `og:site_name`, then the host. A cross-origin icon is left out, because MWA only accepts a path relative to `uri` or a `data:` URI.
