# Knowledge Bundle

This directory contains OKF-formatted knowledge files for AI agents working with the Vue Solana monorepo.

## Concepts

- [Solana Concepts For Vue Developers](./concepts/solana-for-vue-developers.md) — practical overview of Solana terms, RPC, transactions, and commitment levels
- [Solana Clusters](./concepts/clusters.md) — cluster types and how to choose the right one
- [@solana/web3-compat TypeScript Workaround](./concepts/web3-compat.md) — resolving the broken TypeScript metadata issue

## Guides

- [Getting Started](./guides/getting-started.md) — install, configure, and test the Vue Solana packages
- [Wallet Support](./guides/wallets.md) — unified wallet discovery, selection, and connection
- [Android Mobile Wallets](./guides/wallet-android.md) — Solana Mobile Wallet Adapter on Android
- [iOS Browser Wallets](./guides/wallet-ios.md) — Phantom, Solflare, and Backpack universal links on iOS
- [Message Signing For Authentication](./guides/message-signing.md) — wallet-auth challenges without on-chain transactions
- [Troubleshooting](./guides/troubleshooting.md) — common issues and solutions

## Package References

- [API Reference](./packages/index.md) — overview of all package APIs
- [@vue-solana/core](./packages/core.md) — framework-agnostic config, RPC, wallet types, and transaction helpers
- [@vue-solana/vue](./packages/vue.md) — Vue plugin and composables
- [@vue-solana/nuxt](./packages/nuxt.md) — Nuxt module config and auto-imported composables

## Other

- [Agent Skill](./agent-skill.md) — installable Agent Skill for AI coding agents
- [Change Log](./log.md)

## Plans

Plans live in the top-level [`plans/`](../plans/) directory:

- [v1 Roadmap](../plans/v1-roadmap.md)
- [Native Wallet Plan](../plans/native-wallet-plan.md)
- [Solana Pay QR Plan](../plans/solana-pay-qr-plan.md)
- [Standalone Package Install Plan](../plans/stand-alone-package-install-plan.md)
