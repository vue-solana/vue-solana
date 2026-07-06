---
title: Vue Solana Documentation
description: Documentation for Vue and Nuxt libraries that help developers use Solana.
ogSection: Overview
surroundOrder: 1
---

Vue Solana is a small ecosystem of Vue and Nuxt packages for building Solana applications.

Vue Solana provides RPC setup, reactive account reads, balance reads, browser extension wallet discovery, Android Mobile Wallet Adapter discovery, iOS browser wallet links, wallet connect/disconnect, and transaction transfer flows through Vue and Nuxt composables. The examples use devnet by default for safe testing.

## Packages

- [`@vue-solana/core`](/packages/core): framework-agnostic Solana config, endpoint helpers, wallet types, and transaction helpers.
- [`@vue-solana/vue`](/packages/vue): Vue plugin and composables.
- [`@vue-solana/nuxt`](/packages/nuxt): Nuxt module that installs the Vue plugin and auto-imports composables.

`@vue-solana/core` builds on top of `@solana/web3-compat` and re-exports supported Solana primitives from `@vue-solana/core/web3`. Vue apps can use `@vue-solana/vue/web3`, and Nuxt apps can use `@vue-solana/nuxt/web3`, without installing core directly.

## Start Here

- [Getting Started](/getting-started)
- [Wallet Guide](/guides/wallets)
- [Transaction Guide](/guides/transactions)
- [Solana For Vue Developers](/concepts/solana-for-vue-developers)
- [Clusters](/concepts/clusters)
- [v1 Roadmap](/roadmap)
- [Agent Skill](/agent-skill)
- [Troubleshooting](/troubleshooting)

## API Reference

- [`@vue-solana/core`](/packages/core): config, endpoints, wallet interfaces, Wallet Standard helpers, mobile/iOS helpers, transaction helpers, and normalized errors.
- [`@vue-solana/vue`](/packages/vue): Vue plugin and composables for RPC, account reads, wallets, messages, signatures, and transactions.
- [`@vue-solana/nuxt`](/packages/nuxt): Nuxt module options, runtime behavior, and auto-imported composables.

## Examples

- [Live Demo](/demo)
- [Vue Vite example](/examples/vue-vite)
- [Nuxt example](/examples/nuxt)

## For Package Users

Start with [Getting Started](/getting-started) to install the Vue or Nuxt package in your own app. Use the [Live Demo](/demo) to try devnet RPC reads, wallet connection, message signing, and transfer flows before wiring the composables into your project.

Official Solana references:

- [Solana Documentation](https://solana.com/docs)
- [Solana RPC Methods](https://solana.com/docs/rpc)
- [Solana Clusters](https://solana.com/docs/references/clusters)
- [Solana Faucet](https://faucet.solana.com)
