# Native Wallet Support Plan

This document tracks support for mobile native wallets and post-v1 desktop native wallets on top of the existing browser extension wallet support.

All wallet sources should be exposed through the existing unified `useWallets()` and `useWallet()` flow. Do not add separate public composables such as `useMobileWallets()` or `useDesktopWallets()` unless the architecture changes deliberately.

When a plan step is implemented, strike it through. When every step under a feature is implemented, remove the plan items and leave only the checked feature title.

Example completed feature format:

```md
## [x] Mobile Native Wallets
```

## [x] Android Mobile Native Wallets

## [x] iOS Browser Wallet Support

## [ ] Future iOS Wallet Support

- [ ] Research and add Trust Wallet support for iOS browser wallet flows through the unified `useWallets()` and `useWallet()` API.

## [x] Desktop Native Wallets

Decision: desktop native wallet support is deferred from v1. Keep future desktop native work in the unified `useWallets()` and `useWallet()` flow, but do not block the first stable release on desktop app protocols, install flows, or native adapter coverage.

Post-v1 follow-up scope:

- Research desktop native Solana wallet integration options, including Wallet Standard registration, protocol links, app install flows, and supported operating systems.
- Define desktop native wallet metadata in `SolanaWalletInfo`, including platform, adapter source, app URL, protocol URL, and install URL where applicable.
- Add a core desktop native wallet adapter that maps native app connect, disconnect, sign, sign-all, and sign-and-send flows into `SolanaWallet`.
- Detect desktop native wallet availability without assuming browser extension APIs exist.
- Add protocol link fallback handling for native wallets that require launching an installed desktop app.
- Merge desktop native wallets into the unified wallet discovery path used by `useWallets()` without regressing existing browser extension wallets.
- Update Vue plugin behavior only where needed to preserve the current `useWallets()` and `useWallet()` public API.
- Add tests for desktop native discovery, unavailable wallet handling, selection, connect failure, disconnect, and signing feature availability.
- Document desktop native wallet setup, limitations, supported wallets, and manual testing flow.

## [x] Browser Extension Wallet Compatibility

## [x] Public API And Types

## [x] Nuxt Integration

## [x] Examples And Manual Testing
