---
"@vue-solana/core": patch
"@vue-solana/vue": patch
"@vue-solana/nuxt": patch
---

`useSolanaQrScanner()` now reads QR codes on phones where the browser's `BarcodeDetector` never finds one (seen on a Galaxy A50 in Chrome), and on iOS and Firefox, which have no `BarcodeDetector`. Each frame still goes to `BarcodeDetector` first, then to the `jsqr` decoder when it finds nothing. The decoder is downloaded on the first `start()`, so apps that never open the camera never load it. It reads the centre square of the frame, matching a square, cropped preview. `start()` now rejects only when there is no camera, or when neither decoder is available.
