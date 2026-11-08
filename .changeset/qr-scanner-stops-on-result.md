---
"@vue-solana/core": patch
"@vue-solana/vue": patch
"@vue-solana/nuxt": patch
---

Fix `useSolanaQrScanner()` getting stuck on "scanning". The camera now closes once a valid Solana Pay URL is read, and a QR code that is not a payment URL sets `error` instead of being skipped silently. `start()` rejects without opening the camera when the browser cannot detect QR codes (no `BarcodeDetector`, as on iOS and Firefox, or one without `qr_code` support). It also asks for a 1280x720 stream, because the default 640x480 one is too coarse for a dense payment QR code. Detection no longer overlaps, and it waits for a decoded video frame.
