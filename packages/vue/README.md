# @vue-solana/vue

Vue plugin and composables for Solana applications.

Use this package in Vue 3 apps that need Solana RPC access, balance reads, wallet state, and transaction helper state.

New to Solana? Start with the official docs and the project concepts guide:

- [Solana Documentation](https://solana.com/docs)
- [Solana RPC Methods](https://solana.com/docs/rpc)
- [Solana Clusters](https://solana.com/docs/references/clusters)
- [Vue Solana Concepts Guide](https://github.com/vue-solana/vue-solana/tree/main/apps/docs/content/concepts/solana-for-vue-developers.md)
- [`@vue-solana/vue` docs](https://github.com/vue-solana/vue-solana/tree/main/apps/docs/content/packages/vue.md)

## Install

```sh
pnpm add @vue-solana/vue @vue-solana/core @solana/web3-compat
```

```sh
npm install @vue-solana/vue @vue-solana/core @solana/web3-compat
```

## Plugin Setup

```ts
import { createApp } from "vue";
import { createSolanaPlugin } from "@vue-solana/vue";
import App from "./App.vue";

createApp(App)
  .use(
    createSolanaPlugin({
      cluster: "devnet",
    }),
  )
  .mount("#app");
```

You can also pass a custom RPC endpoint:

```ts
createApp(App).use(
  createSolanaPlugin({
    cluster: "mainnet-beta",
    endpoint: "https://your-rpc.example.com",
    commitment: "confirmed",
  }),
);
```

Supported clusters are `mainnet-beta`, `devnet`, `testnet`, and `localnet`. Use `mainnet-beta` for Solana mainnet; this is Solana's official cluster name.

For development, use `devnet` and request free test SOL from the official faucet:

```txt
https://faucet.solana.com
```

## Read RPC State

```vue
<script setup lang="ts">
import { useRpc } from "@vue-solana/vue";

const { cluster, endpoint, status, error, latestBlockhash, checkConnection } = useRpc();
</script>

<template>
  <section>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Status: {{ status }}</p>
    <p>Latest blockhash: {{ latestBlockhash }}</p>
    <p v-if="error">Error: {{ error }}</p>
    <button type="button" @click="checkConnection">Check RPC</button>
  </section>
</template>
```

## Read Balance

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useBalance } from "@vue-solana/vue";

const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useBalance(address);
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
import { useWallet } from "@vue-solana/vue";

const { publicKey, connected, connecting, connect, disconnect } = useWallet();
</script>

<template>
  <section>
    <p>Connected: {{ connected }}</p>
    <p>Public key: {{ publicKey?.toBase58() }}</p>
    <p v-if="connecting">Connecting...</p>
    <button type="button" @click="connect">Connect</button>
    <button type="button" @click="disconnect">Disconnect</button>
  </section>
</template>
```

Browser wallet discovery is not included yet. `connect()` works only after you configure a wallet object that implements `SolanaWallet`.

## Transaction State

```ts
import { useSignAndSendTransaction } from "@vue-solana/vue";

const { signature, loading, error, execute } = useSignAndSendTransaction();

await execute(transaction, {
  skipPreflight: false,
});
```

The current wallet must be connected and support either `signAndSendTransaction` or `signTransaction`.

## Example App

This README includes small snippets for quick reference. For a complete runnable Vue + Vite flow, see the example app:

```sh
pnpm dev:vue
```

Source: [`examples/vue-vite`](https://github.com/vue-solana/vue-solana/tree/main/examples/vue-vite)

## API

- `createSolanaPlugin(options?)`: installs the Vue Solana context.
- `VueSolana`: alias for `createSolanaPlugin`.
- `useSolana()`: returns the full injected Solana context.
- `useRpc()`: returns cluster, endpoint, connection status, latest blockhash, and `checkConnection()`.
- `useConnection()`: returns the Solana `Connection`.
- `useWallet()`: returns wallet refs, computed connection state, and wallet actions.
- `useBalance(address, commitment?)`: loads lamport balance for a `PublicKey` or address string.
- `useTransaction(handler)`: generic async transaction state helper.
- `useSignAndSendTransaction()`: signs and sends a transaction through the configured wallet.

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

This package is early-stage. RPC and balance reads are usable; first-class browser wallet adapter support is planned.
