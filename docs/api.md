# API Reference

This section summarizes the public APIs exported by the Vue Solana packages.

`@vue-solana/core` builds on top of `@solana/web3-compat` and re-exports supported Solana primitives from `@vue-solana/core/web3`. Use Vue Solana packages for Vue/Nuxt-friendly setup, config, wallet state, composables, and supported raw primitives; direct `@solana/web3-compat` imports are only needed for legacy boundaries or troubleshooting.

Package references:

- [`@vue-solana/core`](./api/core.md): framework-agnostic config, RPC, wallet types, wallet helpers, and transaction helpers.
- [`@vue-solana/vue`](./api/vue.md): Vue plugin and composables.
- [`@vue-solana/nuxt`](./api/nuxt.md): Nuxt module config and auto-imported composables.

Related docs:

- [Wallet Support](./wallets.md)
- [Solana Concepts For Vue Developers](./solana-concepts.md)
- [Troubleshooting](./troubleshooting.md)
- Official [Solana Documentation](https://solana.com/docs)
