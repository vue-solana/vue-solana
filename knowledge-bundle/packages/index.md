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

`@vue-solana/core` builds on [`@solana/kit`](https://solana.com/docs/kit). It exposes `createSolanaClient()` and re-exports Kit primitives (`address`, `lamports`, and types) from `@vue-solana/core/kit`. Vue apps use `@vue-solana/vue/kit`, and Nuxt apps use `@vue-solana/nuxt/kit`. The legacy `@solana/web3-compat` surface and the `web3` subpaths were removed in v2.0.0.

Package references:

- [`@vue-solana/core`](./core.md): framework-agnostic config, RPC, wallet types, wallet helpers, and transaction helpers.
- [`@vue-solana/vue`](./vue.md): Vue plugin and composables.
- [`@vue-solana/nuxt`](./nuxt.md): Nuxt module config and auto-imported composables.

Related docs:

- [Wallet Support](../guides/wallets.md)
- [Solana Concepts For Vue Developers](../concepts/solana-for-vue-developers.md)
- [Troubleshooting](../guides/troubleshooting.md)
- Official [Solana Documentation](https://solana.com/docs)
