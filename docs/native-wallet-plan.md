# Native Wallet Support Plan

This document tracks support for mobile native wallets and desktop native wallets on top of the existing browser extension wallet support.

All wallet sources should be exposed through the existing unified `useWallets()` and `useWallet()` flow. Do not add separate public composables such as `useMobileWallets()` or `useDesktopWallets()` unless the architecture changes deliberately.

When a plan step is implemented, strike it through. When every step under a feature is implemented, remove the plan items and leave only the checked feature title.

Example completed feature format:

```md
## [x] Mobile Native Wallets
```

## [x] Android Mobile Native Wallets

## [ ] iOS Browser Wallet Support

- [ ] Research wallet-specific iOS universal link and deep link APIs for Phantom, Solflare, Backpack, and other major Solana wallets.
- [ ] Define iOS wallet metadata in `SolanaWalletInfo`, including `platform`, `source`, `appUrl`, `installUrl`, callback URL requirements, and supported capabilities.
- [ ] Add SSR-safe iOS runtime detection without assuming Mobile Wallet Adapter is available.
- [ ] Add iOS wallet fallback entries to the unified wallet discovery path used by `useWallets()` without claiming unsupported signing capabilities.
- [ ] Implement wallet-specific iOS connect, disconnect, sign, sign-all, and sign-and-send adapters only where the wallet protocol is documented and stable.
- [ ] Add callback or redirect handling for iOS wallet flows where required.
- [ ] Add tests for iOS discovery, unavailable wallet handling, link fallback behavior, callback validation, and unsupported capability reporting.
- [ ] Document iOS browser limitations, supported wallets, setup requirements, callback URL requirements, and manual testing flow.

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

## [ ] Browser Extension Wallet Compatibility

- [ ] Verify existing Wallet Standard browser extension discovery still works after adding native wallet sources.
- [ ] Ensure wallet selection continues to disconnect other connected adapters when a new wallet connects.
- [ ] Preserve manual wallet injection through `setWallet()`.
- [ ] Preserve SSR-safe behavior by returning no runtime wallets when `window` is unavailable.
- [ ] Add regression tests around browser wallet discovery, selection, and signing.
- [ ] Update docs to explain that browser extension, mobile native, and desktop native wallets share the same `useWallets()` and `useWallet()` flow.

## [ ] Public API And Types

- [ ] Extend wallet types with platform and source fields while keeping existing consumers source-compatible where possible.
- [ ] Export any new adapter helpers from `@vue-solana/core`.
- [ ] Confirm package export maps include new core modules.
- [ ] Confirm Vue and Nuxt public composables do not need new names because native wallets use the unified `useWallets()` API.
- [ ] Add or update API docs for new fields and helpers.

## [ ] Nuxt Integration

- [ ] Confirm native wallet discovery runs only on the client.
- [ ] Update Nuxt runtime plugin only if new configuration is needed.
- [ ] Add Nuxt module tests for any new runtime config or auto-import behavior.
- [ ] Document Nuxt-specific setup and SSR caveats.

## [ ] Examples And Manual Testing

- [ ] Update the Vue Vite example to show browser extension, mobile native, and desktop native wallet options in one wallet list.
- [ ] Update the Nuxt example with the same unified wallet list behavior.
- [ ] Add manual testing instructions for Android, iOS, macOS, Windows or Linux where supported, and browser extension regression.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm test`.
- [ ] Run `pnpm build`.
