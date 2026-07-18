---
type: Guide
title: iOS Browser Wallets
description: Phantom, Solflare, and Backpack universal link wallet support on iOS browsers through the unified useWallets flow.
tags:
  - wallets
  - ios
  - universal-links
  - phantom
  - solflare
  - backpack
resource: https://docs.solanamobile.com
timestamp: 2025-07-17T00:00:00Z
---

# iOS Browser Wallets

iOS browser wallet support uses wallet-specific universal links because iOS browsers do not support Solana Mobile Wallet Adapter web flows. Vue Solana exposes Phantom, Solflare, and Backpack entries through the same `useWallets()` list on iOS browsers.

## Supported Capabilities

| Wallet   | Connect | Sign message | Sign transaction | Sign all transactions | Sign and send transaction |
| -------- | ------- | ------------ | ---------------- | --------------------- | ------------------------- |
| Phantom  | Yes     | No           | Yes              | Yes                   | No                        |
| Solflare | Yes     | No           | Yes              | Yes                   | Yes                       |
| Backpack | Yes     | No           | Yes              | Yes                   | Yes                       |

Phantom's `signAndSendTransaction` deeplink is deprecated by Phantom, so Vue Solana does not expose that capability for Phantom iOS entries.

## Plugin Configuration

Configure app identity and callback URL when installing the Vue plugin:

```ts
createApp(App).use(
  createSolanaPlugin({
    cluster: "devnet",
    iosWallet: {
      appIdentity: {
        name: "My Vue Solana App",
        uri: "https://example.com",
        icon: "https://example.com/favicon.ico",
      },
      redirectUrl: "https://example.com/wallet-callback",
    },
  }),
);
```

Disable iOS browser wallet entries if your app does not want them:

```ts
createApp(App).use(
  createSolanaPlugin({
    cluster: "devnet",
    iosWallet: false,
  }),
);
```

## Callback Notes

- Wallet apps redirect back to `redirectUrl` with encrypted callback data.
- The Vue plugin handles callbacks during `refreshWallets()` and stores iOS wallet sessions in `sessionStorage`.
- Apps with custom callback routes can also call `handleSolanaIosWalletCallback()` from `@vue-solana/core/ios-wallet`.
- Pending iOS callback state expires after 10 minutes and is cleared after success, wallet errors, incomplete callbacks, decrypt failures, or invalid public keys.
- iOS `connect()` opens a wallet app and waits for a redirect; the original promise does not resolve if the user cancels or never returns to the browser. Reflect that possibility in app UI.
- Use an HTTPS callback URL for browser apps. Custom schemes are mainly for native apps.

## Related

- [Wallet Support](./wallets.md)
- [Android Mobile Wallets](./wallet-android.md)
