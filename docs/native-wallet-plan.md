# Native Wallet Support Plan

This document tracks support for mobile native wallets and desktop native wallets on top of the existing browser extension wallet support.

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

## [ ] Desktop Native Wallets

- [ ] Research desktop native Solana wallet integration options, including Wallet Standard registration, protocol links, app install flows, and supported operating systems.
- [ ] Define desktop native wallet metadata in `SolanaWalletInfo`, including platform, adapter source, app URL, protocol URL, and install URL where applicable.
- [ ] Add a core desktop native wallet adapter that maps native app connect, disconnect, sign, sign-all, and sign-and-send flows into `SolanaWallet`.
- [ ] Detect desktop native wallet availability without assuming browser extension APIs exist.
- [ ] Add protocol link fallback handling for native wallets that require launching an installed desktop app.
- [ ] Merge desktop native wallets into the unified wallet discovery path used by `useWallets()` without regressing existing browser extension wallets.
- [ ] Update Vue plugin behavior only where needed to preserve the current `useWallets()` and `useWallet()` public API.
- [ ] Add tests for desktop native discovery, unavailable wallet handling, selection, connect failure, disconnect, and signing feature availability.
- [ ] Document desktop native wallet setup, limitations, supported wallets, and manual testing flow.

## [x] Browser Extension Wallet Compatibility

## [x] Public API And Types

## [x] Nuxt Integration

## [ ] Examples And Manual Testing

- [ ] Update the Vue Vite example to show browser extension, mobile native, and desktop native wallet options in one wallet list.
- [ ] Update the Nuxt example with the same unified wallet list behavior.
- [ ] Add manual testing instructions for Android, iOS, macOS, Windows or Linux where supported, and browser extension regression.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm test`.
- [ ] Run `pnpm build`.
