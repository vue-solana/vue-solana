---
type: Guide
title: Android Mobile Wallets
description: Solana Mobile Wallet Adapter support on Android Chrome and Chrome PWAs through the unified useWallets flow.
tags:
  - wallets
  - android
  - mobile-wallet-adapter
  - MWA
resource: https://docs.solanamobile.com
timestamp: 2025-07-17T00:00:00Z
---

# Android Mobile Wallets

Android mobile wallet support uses `@solana-mobile/wallet-standard-mobile`. The Vue plugin registers Mobile Wallet Adapter during wallet refresh on supported Android Chrome clients. The registered adapter then appears as a standard wallet and is adapted through the same Wallet Standard adapter as browser extension wallets.

## Plugin Configuration

Configure app identity when installing the Vue plugin:

```ts
createApp(App).use(
  createSolanaPlugin({
    cluster: "devnet",
    mobileWallet: {
      appIdentity: {
        name: "My Vue Solana App",
        uri: "https://example.com",
        icon: "favicon.ico",
      },
    },
  }),
);
```

Disable Android mobile wallet registration if your app does not want it:

```ts
createApp(App).use(
  createSolanaPlugin({
    cluster: "devnet",
    mobileWallet: false,
  }),
);
```

## Platform Notes

- Supported: Android Chrome and Android Chrome PWAs.
- Not supported by MWA web: iOS Safari, iOS Chrome, Firefox Android, Brave Android, Opera Android, and desktop browsers.
- The registration helper is SSR-safe and returns without registering when `window` is unavailable.
- The mobile wallet package handles installed-wallet fallback UI through its default wallet-not-found handler.
- Browsers may show a one-time Local Network Access prompt before MWA can connect to an installed wallet app.

## Wallet Metadata

`SolanaWalletInfo.platform` is `"mobile"` and `SolanaWalletInfo.source` is `"mobile-wallet-adapter"` for the Android MWA wallet. Browser extension wallets use `platform: "browser"` and `source: "wallet-standard"`. iOS browser wallet entries use `platform: "mobile"` and `source: "deep-link"`.

## Android MWA Transaction Sends

For Android MWA transaction sends, Vue Solana asks the mobile wallet to sign and then submits the signed transaction through the app's RPC connection when the wallet supports `signTransaction`. This keeps the returned signature under app control and avoids a mobile handoff edge case where the wallet sends successfully but the browser page does not receive the wallet adapter response.

## Related

- [Wallet Support](./wallets.md)
- [iOS Browser Wallets](./wallet-ios.md)
