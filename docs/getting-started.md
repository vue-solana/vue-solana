# Getting Started

This guide covers installing the Vue Solana packages, configuring Vue or Nuxt, testing RPC reads, connecting browser wallets, and sending a small devnet transfer.

More references:

- [Solana Concepts For Vue Developers](./solana-concepts.md)
- [API Reference](./api.md)
- [Wallet Support](./wallets.md)
- [Troubleshooting](./troubleshooting.md)

Official Solana references:

- [Solana Documentation](https://solana.com/docs)
- [Solana RPC Methods](https://solana.com/docs/rpc)
- [Solana Clusters](https://solana.com/docs/references/clusters)

## Before You Start

Use `@solana/web3-compat` directly if you only need raw Solana APIs. Use `@vue-solana/vue` or `@vue-solana/nuxt` when you want Vue/Nuxt integration.

Supported clusters:

- `mainnet-beta`: Solana mainnet. This is Solana's official mainnet cluster name.
- `devnet`: best default for app development.
- `testnet`: validator and protocol testing network.
- `localnet`: local validator.

Use `devnet` while learning and testing. Use `mainnet-beta` only when you are ready to interact with real SOL.

Install the package for your framework:

```sh
pnpm add @vue-solana/vue @vue-solana/core @solana/web3-compat buffer
```

For local development, use workspace linking instead:

```sh
pnpm add '@vue-solana/vue@workspace:*' '@vue-solana/core@workspace:*' @solana/web3-compat buffer
```

That only works inside this monorepo or another pnpm workspace that includes these packages.

For an external example app before publishing, use one of these:

```sh
pnpm add ../path-to/vue-solana/packages/vue ../path-to/vue-solana/packages/core @solana/web3-compat buffer
```

For Nuxt:

```sh
pnpm add @vue-solana/nuxt @vue-solana/vue @vue-solana/core @solana/web3-compat buffer
```

Again, for local development, use workspace linking instead:

```sh
pnpm add '@vue-solana/nuxt@workspace:*' '@vue-solana/vue@workspace:*' '@vue-solana/core@workspace:*' @solana/web3-compat buffer
```

That only works inside this monorepo or another pnpm workspace that includes these packages.

For an external example app before publishing, use one of these:

```sh
pnpm add ../path-to/vue-solana/packages/nuxt ../path-to/vue-solana/packages/vue ../path-to/vue-solana/packages/core @solana/web3-compat buffer
```

## Known TypeScript Issue

`@solana/web3-compat@0.0.21` currently has broken TypeScript metadata. Its package metadata points to `dist/types/index.d.ts`, but that file is not included in the published package.

Runtime imports still use the real `@solana/web3-compat` package. If TypeScript reports that it cannot find declarations for `@solana/web3-compat`, add this local declaration file to your app as `types/web3-compat.d.ts`:

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

Make sure your `tsconfig.json` includes the file. Most Vue and Nuxt apps include `**/*.d.ts` by default. If yours does not, add an include pattern such as `types/**/*.d.ts`.

## Vue

```ts
import { createApp } from "vue";
import { createSolanaPlugin } from "@vue-solana/vue";

createApp(App).use(
  createSolanaPlugin({
    cluster: "devnet",
  }),
);
```

## Nuxt

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
  },
});
```

## Manual Dev Testing

This guide tests the current libraries against Solana devnet. Devnet uses test SOL with no real value.

### 1. Install Workspace Dependencies

From the repository root:

```sh
pnpm install
```

### 2. Build The Local Packages

```sh
pnpm build:packages
```

This builds:

- `@vue-solana/core`
- `@vue-solana/vue`
- `@vue-solana/nuxt`

### 3. Run Type Checks

```sh
pnpm typecheck
```

This catches TypeScript issues before testing in an app.

### 4. Install A Browser Wallet

Install one Solana wallet browser extension:

- Phantom: `https://phantom.com`
- Solflare: `https://solflare.com`
- Backpack: `https://backpack.app`

Create a new wallet for development only. Do not use a wallet that holds real assets.

### 5. Switch The Wallet To Devnet

Open the wallet extension settings and switch the network to `Devnet`.

The exact setting name depends on the wallet. It is usually under developer settings, network settings, or advanced settings.

### 6. Get Devnet Or Testnet SOL

Copy your wallet address and request devnet or testnet SOL from the Solana faucet:

```txt
https://faucet.solana.com
```

Choose `Devnet` while following this guide. Choose `Testnet` only if you are testing against the testnet cluster.

If you have the Solana CLI installed, you can also run:

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url devnet
```

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url testnet
```

Devnet and testnet SOL have no real value. Never use a wallet with real funds while testing.

### 7. Test RPC Without A Wallet

The current packages can already test RPC access without connecting a browser wallet.

This guide keeps copy-paste snippets inline so you can see the moving parts. For a complete runnable Vue app, use the Vite example:

```sh
pnpm dev:vue
```

The app lives at [`examples/vue-vite`](../examples/vue-vite) and demonstrates plugin setup, RPC state, direct connection calls, balance reads, browser wallet discovery, wallet state, generic transaction state, and real devnet transfers.

If you are wiring your own playground, use these dependencies:

```json
{
  "dependencies": {
    "@solana/web3-compat": "^0.0.21",
    "@vue-solana/core": "workspace:*",
    "@vue-solana/vue": "workspace:*",
    "buffer": "^6.0.3",
    "vue": "^3.5.0"
  }
}
```

Then install again from the repository root:

```sh
pnpm install
```

In a Vue app, register the plugin:

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

Then test `useRpc()` inside a component:

```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRpc } from "@vue-solana/vue";

const { cluster, endpoint, connection } = useRpc();
const latestBlockhash = ref<string | null>(null);
const error = ref<unknown>(null);

onMounted(async () => {
  try {
    const result = await connection.getLatestBlockhash();
    latestBlockhash.value = result.blockhash;
  } catch (cause) {
    error.value = cause;
  }
});
</script>

<template>
  <main>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Latest blockhash: {{ latestBlockhash }}</p>
    <pre v-if="error">{{ error }}</pre>
  </main>
</template>
```

Expected result:

- `Cluster` shows `devnet`.
- `Endpoint` shows a devnet RPC URL.
- `Latest blockhash` eventually shows a non-empty string.

### 8. Test Balance Reads

Use the wallet address from your devnet wallet.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useBalance } from "@vue-solana/vue";

const address = ref("PASTE_YOUR_DEVNET_WALLET_ADDRESS");
const { balance, loading, error, refresh } = useBalance(address);
</script>

<template>
  <main>
    <p>Address: {{ address }}</p>
    <p>Loading: {{ loading }}</p>
    <p>Balance in lamports: {{ balance }}</p>
    <button type="button" @click="refresh">Refresh</button>
    <pre v-if="error">{{ error }}</pre>
  </main>
</template>
```

Expected result:

- The balance loads as a number in lamports.
- `1 SOL` equals `1_000_000_000` lamports.
- After an airdrop, clicking `Refresh` should show the updated balance.

To run the Vue example app:

```sh
pnpm dev:vue
```

You can also run it by package name:

```sh
pnpm --filter @vue-solana/example-vue-vite dev
```

### 9. Test The Nuxt Module

For a complete runnable Nuxt app, use the Nuxt example:

```sh
pnpm dev:nuxt
```

The app lives at [`examples/nuxt`](../examples/nuxt) and demonstrates module setup, Nuxt auto-imports, RPC state, direct connection calls, balance reads, browser wallet discovery, wallet state, generic transaction state, and real devnet transfers.

If you are wiring your own Nuxt app, use these dependencies:

```json
{
  "dependencies": {
    "@solana/web3-compat": "^0.0.21",
    "@vue-solana/core": "workspace:*",
    "@vue-solana/vue": "workspace:*",
    "@vue-solana/nuxt": "workspace:*",
    "buffer": "^6.0.3",
    "nuxt": "^3.0.0",
    "vue": "^3.5.0"
  }
}
```

Then install again from the repository root:

```sh
pnpm install
```

In a Nuxt app, configure the module:

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
  },
});
```

Then use the auto-imported composables in a page:

```vue
<script setup lang="ts">
const { cluster, endpoint, connection } = useSolanaRpc();
const blockhash = ref<string | null>(null);

onMounted(async () => {
  const result = await connection.getLatestBlockhash();
  blockhash.value = result.blockhash;
});
</script>

<template>
  <main>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Blockhash: {{ blockhash }}</p>
  </main>
</template>
```

Expected result:

- Nuxt starts without module errors.
- The composables are auto-imported.
- The page can read a latest devnet blockhash.

To run the Nuxt example app:

```sh
pnpm dev:nuxt
```

You can also run it by package name:

```sh
pnpm --filter @vue-solana/example-nuxt dev
```

### 10. Test Browser Wallet Discovery

Install a Solana browser wallet such as Phantom, Solflare, or Backpack, switch it to devnet, and open one of the example apps.

In Vue, discover and select wallets with `useWallets()`:

```vue
<script setup lang="ts">
import { useWallet, useWallets } from "@vue-solana/vue";

const { wallets, selectedWallet, refreshWallets, selectWallet } = useWallets();
const { publicKey, connected, connecting, connect, disconnect } = useWallet();
</script>

<template>
  <main>
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

    <button type="button" :disabled="!selectedWallet || connecting || connected" @click="connect">
      Connect
    </button>
    <button type="button" :disabled="!connected" @click="disconnect">Disconnect</button>
  </main>
</template>
```

In Nuxt, use the auto-imported composables:

```ts
const { wallets, selectedWallet, refreshWallets, selectWallet } = useSolanaWallets();
const { publicKey, connected, connect, disconnect } = useSolanaWallet();
```

Expected result:

- Installed standard wallets appear in the wallet list.
- Selecting a wallet configures the active wallet, but does not connect it.
- `connect()` opens the wallet extension approval flow.
- After approval, `publicKey` shows the connected wallet address.

Some extensions expose previously authorized accounts after a page refresh. Vue Solana still keeps `connected` false until the app explicitly calls `connect()` and that call succeeds.

### 11. Send A Real Devnet Transfer

Use a devnet wallet with enough devnet SOL for fees. The examples include recipient address and amount fields. Start with a tiny amount such as `0.000001` SOL.

The transfer flow creates a normal legacy transaction. In browser apps, add the `buffer` package and initialize it from `buffer/` before transaction code that may touch `@solana/web3-compat` internals:

```ts
import { Buffer } from "buffer/";
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3-compat";

(globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer = Buffer;

const systemProgramId = new PublicKey("11111111111111111111111111111111");

const transaction = new Transaction();
const latestBlockhash = await connection.getLatestBlockhash();
const recipientPublicKey = new PublicKey(recipientAddress.value);
const data = new Uint8Array(12);
const view = new DataView(data.buffer);

view.setUint32(0, 2, true);
view.setBigUint64(4, BigInt(lamports), true);

transaction.feePayer = publicKey.value;
transaction.recentBlockhash = latestBlockhash.blockhash;
transaction.add(
  new TransactionInstruction({
    keys: [
      { pubkey: publicKey.value, isSigner: true, isWritable: true },
      { pubkey: recipientPublicKey, isSigner: false, isWritable: true },
    ],
    programId: systemProgramId,
    data,
  }),
);

await sendTransaction.execute(transaction, {
  skipPreflight: false,
});
```

Expected result:

- The wallet prompts you to approve the transfer.
- The example displays a transaction signature.
- The sender balance decreases by the transfer amount plus fees.

### 12. Final Verification

After manual testing, run:

```sh
pnpm typecheck
pnpm build:packages
```
