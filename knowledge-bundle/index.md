# Knowledge Bundle

This directory contains OKF-formatted knowledge files for AI agents working with the Vue Solana monorepo.

## Concepts

- [Solana Concepts For Vue Developers](./concepts/solana-for-vue-developers.md) — practical overview of Solana terms, RPC, transactions, and commitment levels
- [Solana Clusters](./concepts/clusters.md) — cluster types and how to choose the right one
- [@solana/web3-compat TypeScript Workaround (v1, archived)](./concepts/web3-compat.md) — historical v1.x shim guidance

## Guides

- [Getting Started](./guides/getting-started.md) — install, configure, and test the Vue Solana packages
- [Kit Migration](./guides/kit-migration.md) — migrate from the legacy web3-compat API to @solana/kit (v2)
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

- [Roadmap](../apps/docs/content/roadmap.md)
- [React README Parity Plan](../plans/react-readme-parity-plan.md)
- [Native Wallet Plan](../plans/native-wallet-plan.md)
- [Archived Plans](../plans/archived/) (completed: Kit migration, SPL tokens, standalone installs, v1 roadmap, Solana Pay QR, package-improvement phases 1–9)
- [Standalone Package Install Plan](../plans/archived/stand-alone-package-install-plan.md)
- [Solana Pay QR Plan](../plans/archived/solana-pay-qr-plan.md)
- [Package Improvements Phases 1–8](../plans/archived/package-improvements-phases-1-8.md)
- [Package Improvements Phase 9](../plans/archived/package-improvements-phase-9.md)
