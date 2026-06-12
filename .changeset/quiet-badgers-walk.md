---
"@vue-solana/core": patch
"@vue-solana/vue": patch
---

Improve mobile wallet transaction completion handling across core transaction helpers and Vue transaction composables.

Replace the dynamic `@solana/web3-compat` import in `useBalance()` with a static `PublicKey` import to avoid ineffective dynamic import warnings in consuming Vite/Rollup apps.
