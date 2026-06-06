# @vue-solana/nuxt

Nuxt module for Solana applications.

Use this package in Nuxt apps that need the Vue Solana plugin installed automatically plus auto-imported composables.

New to Solana? Start with the official docs and the project concepts guide:

- [Solana Documentation](https://solana.com/docs)
- [Solana RPC Methods](https://solana.com/docs/rpc)
- [Solana Clusters](https://solana.com/docs/references/clusters)
- [Vue Solana Concepts Guide](https://vue-solana-docs.vercel.app/concepts/solana-for-vue-developers)
- [`@vue-solana/nuxt` docs](https://vue-solana-docs.vercel.app/packages/nuxt)

## Install

```sh
pnpm add @vue-solana/nuxt @vue-solana/vue @vue-solana/core @solana/web3-compat
```

```sh
npm install @vue-solana/nuxt @vue-solana/vue @vue-solana/core @solana/web3-compat
```

## Module Setup

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
  },
});
```

You can also configure a custom RPC endpoint:

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "mainnet-beta",
    endpoint: "https://your-rpc.example.com",
    commitment: "confirmed",
  },
});
```

Supported clusters are `mainnet-beta`, `devnet`, `testnet`, and `localnet`. Use `mainnet-beta` for Solana mainnet; this is Solana's official cluster name.

For development, use `devnet` and request free test SOL from the official faucet:

```txt
https://faucet.solana.com
```

## Auto-Imported Composables

The module auto-imports these composables from `@vue-solana/vue`:

- `useSolana()`
- `useSolanaRpc()`
- `useSolanaConnection()`
- `useSolanaWallet()`
- `useSolanaBalance()`
- `useSolanaSignAndSendTransaction()`

## Read RPC State

```vue
<script setup lang="ts">
const { cluster, endpoint, status, latestBlockhash, checkConnection } = useSolanaRpc();
</script>

<template>
  <section>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Status: {{ status }}</p>
    <p>Latest blockhash: {{ latestBlockhash }}</p>
    <button type="button" @click="checkConnection">Check RPC</button>
  </section>
</template>
```

## Read Balance

```vue
<script setup lang="ts">
const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useSolanaBalance(address);
</script>

<template>
  <section>
    <p>Lamports: {{ balance }}</p>
    <p v-if="loading">Loading...</p>
    <pre v-if="error">{{ error }}</pre>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

## Wallet State

```vue
<script setup lang="ts">
const { wallets, selectedWallet, selectWallet, refreshWallets } = useSolanaWallets();
const { publicKey, connected, connect, disconnect } = useSolanaWallet();
</script>

<template>
  <section>
    <button type="button" @click="refreshWallets">Refresh Wallets</button>
    <button
      v-for="wallet in wallets"
      :key="wallet.name"
      type="button"
      @click="selectWallet(wallet)"
    >
      {{ wallet.name }}
    </button>
    <p>Selected: {{ selectedWallet?.name ?? "None" }}</p>
    <p>Connected: {{ connected }}</p>
    <p>Public key: {{ publicKey?.toBase58() }}</p>
    <button type="button" :disabled="!selectedWallet || connected" @click="connect">Connect</button>
    <button type="button" :disabled="!connected" @click="disconnect">Disconnect</button>
  </section>
</template>
```

Browser wallets are discovered through the Solana Wallet Standard. Wallet actions work after selecting a discovered wallet or configuring a custom `SolanaWallet`.

## Example App

This README includes small snippets for quick reference. For a complete runnable Nuxt flow, see the example app:

```sh
pnpm dev:nuxt
```

Docs: [`examples/nuxt`](https://vue-solana-docs.vercel.app/examples/nuxt)

## Known TypeScript Issue

`@solana/web3-compat@0.0.21` currently has broken TypeScript metadata. Runtime imports still use the real package, but TypeScript consumers may need a local declaration shim.

If TypeScript cannot resolve `@solana/web3-compat`, add `types/web3-compat.d.ts` to your app:

```ts
declare module "@solana/web3-compat" {
  export type { Commitment, SendOptions, TransactionSignature } from "@solana/web3.js";
  export {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction,
    VersionedTransaction,
  } from "@solana/web3.js";
}
```

Make sure your `tsconfig.json` includes `types/**/*.d.ts` or another pattern that includes the shim.

## Status

This package is early-stage. RPC, balance, wallet, and transaction composables are usable in Nuxt apps.
