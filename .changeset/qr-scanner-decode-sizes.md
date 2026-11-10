---
"@vue-solana/core": patch
"@vue-solana/vue": patch
"@vue-solana/nuxt": patch
---

Make `useSolanaQrScanner()` read payment QR codes much faster when the browser's `BarcodeDetector` is missing or never finds a code. The JavaScript decoder now reads each frame at 360px and then 480px instead of once at 720px. The smaller sizes average out camera noise, so more frames decode, and each frame costs about a third of the CPU time. The scanner also requests continuous autofocus on cameras that support it.
