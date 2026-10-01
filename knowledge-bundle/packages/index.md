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

`@vue-solana/core` builds on [`@solana/kit`](https://solana.com/docs/kit). It exposes `createSolanaClient()` and re-exports all of `@solana/kit` from `@vue-solana/core/kit`. The default client composes the official `solanaRpc()` and `rpcAirdrop()` stack, and `solanaRpc()` installs the transaction planner and the plan-signing and plan-sending executors itself. Direct core/Vue clients may configure `payer` or `payerSecretKey`; Nuxt intentionally omits both from public runtime config, so raw secrets must never be placed there. Vue apps use `@vue-solana/vue/kit`, and Nuxt apps use `@vue-solana/nuxt/kit`. The legacy `@solana/web3-compat` surface and the `web3` subpaths were removed in v2.0.0.

All three packages are **ESM only** since v3.0.0 — the `require` export condition and the top-level `main` field were removed. A CommonJS `require()` of the package or any subpath fails with `No "exports" main defined` / `Package subpath './kit' is not defined by "exports"`. Bundlers (Vite, Nuxt) are unaffected; plain Node scripts must be ESM (`"type": "module"` or a `.mjs` file), or the app must stay on `@vue-solana/*@^2`.

Four names exist in both Kit and this library — `SolanaError`, `SolanaErrorCode`, `isSolanaError`, and `TransactionStatus`. They resolve to **this library's** version from the package root and to **Kit's** version from the `/kit` subpath. Consequence: `isSolanaError` imported from the root barrel does not match Kit's error class, so import it from `@vue-solana/*/kit` when inspecting errors thrown by Kit itself.

Package references:

- [`@vue-solana/core`](./core.md): framework-agnostic config, RPC, wallet types, wallet helpers, and transaction helpers.
- [`@vue-solana/vue`](./vue.md): Vue plugin and composables.
- [`@vue-solana/nuxt`](./nuxt.md): Nuxt module config and auto-imported composables.

Related docs:

- [Wallet Support](../guides/wallets.md)
- [Solana Concepts For Vue Developers](../concepts/solana-for-vue-developers.md)
- [Troubleshooting](../guides/troubleshooting.md)
- Official [Solana Documentation](https://solana.com/docs)
