---
title: Vue Solana Documentation
description: Documentation for Vue and Nuxt libraries that help developers use Solana.
---

Vue Solana is a small ecosystem of Vue and Nuxt packages for building Solana applications.

The project is early-stage. RPC setup, balance reads, browser extension wallet discovery, Android Mobile Wallet Adapter discovery, wallet connect/disconnect, and transaction transfer flows are usable today through Vue and Nuxt composables. The examples use devnet by default for safe testing.

## Packages

- [`@vue-solana/core`](/packages/core): framework-agnostic Solana config, endpoint helpers, wallet types, and transaction helpers.
- [`@vue-solana/vue`](/packages/vue): Vue plugin and composables.
- [`@vue-solana/nuxt`](/packages/nuxt): Nuxt module that installs the Vue plugin and auto-imports composables.

`@vue-solana/core` does not replace `@solana/web3-compat`. It builds on top of it. Use `@solana/web3-compat` for raw Solana primitives like `Connection`, `PublicKey`, and transactions. Use Vue Solana packages for shared config, endpoint defaults, wallet interfaces, plugin setup, and composables.

## Start Here

- [Getting Started](/getting-started)
- [Solana For Vue Developers](/concepts/solana-for-vue-developers)
- [Clusters](/concepts/clusters)
- [Wallets](/concepts/wallets)
- [Agent Skill](/agent-skill)
- [Troubleshooting](/troubleshooting)

## Examples

- [Live Demo](/demo)
- [Vue Vite example](/examples/vue-vite)
- [Nuxt example](/examples/nuxt)

Run the docs site locally:

```sh
pnpm dev:docs
```

Official Solana references:

- [Solana Documentation](https://solana.com/docs)
- [Solana RPC Methods](https://solana.com/docs/rpc)
- [Solana Clusters](https://solana.com/docs/references/clusters)
- [Solana Faucet](https://faucet.solana.com)
