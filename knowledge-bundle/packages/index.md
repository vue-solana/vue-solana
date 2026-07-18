---
type: Package Reference
title: API Reference
description: Overview of public APIs exported by the Vue Solana core, vue, and nuxt packages.
tags:
  - API
  - core
  - vue
  - nuxt
  - reference
resource: https://github.com/vue-solana/vue-solana
timestamp: 2025-07-17T00:00:00Z
---

# API Reference

This section summarizes the public APIs exported by the Vue Solana packages.

`@vue-solana/core` builds on top of `@solana/web3-compat` and re-exports supported Solana primitives from `@vue-solana/core/web3`. Vue apps can use `@vue-solana/vue/web3`, and Nuxt apps can use `@vue-solana/nuxt/web3`, without installing core directly. Direct `@solana/web3-compat` imports are only needed for legacy boundaries or troubleshooting.

Package references:

- [`@vue-solana/core`](./core.md): framework-agnostic config, RPC, wallet types, wallet helpers, and transaction helpers.
- [`@vue-solana/vue`](./vue.md): Vue plugin and composables.
- [`@vue-solana/nuxt`](./nuxt.md): Nuxt module config and auto-imported composables.

Related docs:

- [Wallet Support](../guides/wallets.md)
- [Solana Concepts For Vue Developers](../concepts/solana-for-vue-developers.md)
- [Troubleshooting](../guides/troubleshooting.md)
- Official [Solana Documentation](https://solana.com/docs)
