---
"@vue-solana/core": patch
"@vue-solana/vue": patch
"@vue-solana/nuxt": patch
---

Harden wallet account signer adapters: validate that an account object supports the requested chain, enforce signature count/length and normalize decode failures for wallet transaction-sending signers, and correct signer docs/auto-import references.
