---
"@vue-solana/nuxt": patch
"@vue-solana/vue": patch
---

Avoid loading Solana RPC and wallet dependencies during Nuxt server rendering by registering the Nuxt runtime plugin as client-only and skipping the Vue plugin's automatic RPC check on the server.
