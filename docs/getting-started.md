# Getting Started

Install the package for your framework:

```sh
pnpm add @vue-solana/vue @vue-solana/core @solana/web3-compat
```

For Nuxt:

```sh
pnpm add @vue-solana/nuxt @vue-solana/vue @vue-solana/core @solana/web3-compat
```

## Vue

```ts
import { createApp } from 'vue'
import { createSolanaPlugin } from '@vue-solana/vue'

createApp(App).use(createSolanaPlugin({
  cluster: 'devnet'
}))
```

## Nuxt

```ts
export default defineNuxtConfig({
  modules: ['@vue-solana/nuxt'],
  solana: {
    cluster: 'devnet'
  }
})
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
pnpm build
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

### 6. Get Devnet SOL

Copy your wallet address and request devnet SOL from the Solana faucet:

```txt
https://faucet.solana.com
```

Request `1 SOL` on `Devnet`.

If you have the Solana CLI installed, you can also run:

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url devnet
```

### 7. Test RPC Without A Wallet

The current packages can already test RPC access without connecting a browser wallet.

If you do not already have a test app, create a Vue playground inside this monorepo:

```sh
pnpm create vite examples/vue-vite --template vue-ts
```

If `examples/vue-vite` already exists, use another temporary folder name or replace the placeholder example with a real Vite app.

In the playground `package.json`, use the local workspace packages:

```json
{
  "dependencies": {
    "@solana/web3-compat": "^0.0.21",
    "@vue-solana/core": "workspace:*",
    "@vue-solana/vue": "workspace:*",
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
import { createApp } from 'vue'
import { createSolanaPlugin } from '@vue-solana/vue'
import App from './App.vue'

createApp(App)
  .use(createSolanaPlugin({
    cluster: 'devnet'
  }))
  .mount('#app')
```

Then test `useRpc()` inside a component:

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRpc } from '@vue-solana/vue'

const { cluster, endpoint, connection } = useRpc()
const latestBlockhash = ref<string | null>(null)
const error = ref<unknown>(null)

onMounted(async () => {
  try {
    const result = await connection.getLatestBlockhash()
    latestBlockhash.value = result.blockhash
  } catch (cause) {
    error.value = cause
  }
})
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
import { ref } from 'vue'
import { useBalance } from '@vue-solana/vue'

const address = ref('PASTE_YOUR_DEVNET_WALLET_ADDRESS')
const { balance, loading, error, refresh } = useBalance(address)
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

To run the Vue playground:

```sh
pnpm --filter vue-vite dev
```

If the generated app has a different package name, use that package name in the filter.

### 9. Test The Nuxt Module

If you do not already have a Nuxt test app, create one inside this monorepo:

```sh
pnpm dlx nuxi@latest init examples/nuxt
```

If `examples/nuxt` already exists, use another temporary folder name or replace the placeholder example with a real Nuxt app.

In the Nuxt app `package.json`, use the local workspace packages:

```json
{
  "dependencies": {
    "@solana/web3-compat": "^0.0.21",
    "@vue-solana/core": "workspace:*",
    "@vue-solana/vue": "workspace:*",
    "@vue-solana/nuxt": "workspace:*",
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
  modules: ['@vue-solana/nuxt'],
  solana: {
    cluster: 'devnet'
  }
})
```

Then use the auto-imported composables in a page:

```vue
<script setup lang="ts">
const { cluster, endpoint, connection } = useSolanaRpc()
const blockhash = ref<string | null>(null)

onMounted(async () => {
  const result = await connection.getLatestBlockhash()
  blockhash.value = result.blockhash
})
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

To run the Nuxt playground:

```sh
pnpm --filter nuxt dev
```

If the generated app has a different package name, use that package name in the filter.

### 10. Current Wallet Testing Limitation

The current implementation includes `useWallet()`, `setWallet()`, and transaction primitives, but it does not yet include browser wallet adapter support.

That means the libraries do not yet automatically discover installed wallets or connect to Phantom, Solflare, Backpack, or other Solana Wallet Standard wallets.

For now, full wallet testing requires manually passing an object that implements the `SolanaWallet` interface:

```ts
import type { SolanaWallet } from '@vue-solana/core'

const wallet: SolanaWallet = {
  publicKey: null,
  connected: false,
  connect: async () => {},
  disconnect: async () => {}
}
```

This is enough to test app state and composable behavior, but it is not enough for realistic connect, sign, and send flows.

### 11. Wallet Adapter TODO

Add browser wallet adapter support before considering wallet flows production-ready.

This is needed because real Solana users connect through browser wallet extensions that expose wallet APIs at runtime. A Vue/Nuxt library should discover those wallets, expose available wallet choices, manage connection state, and provide signing methods through the existing `SolanaWallet` interface.

TODO:

- [ ] Add Solana Wallet Standard discovery.
- [ ] Expose available wallets from `useWallet()` or a dedicated `useWallets()` composable.
- [ ] Implement connect and disconnect against selected browser wallets.
- [ ] Map wallet signing methods into the existing `SolanaWallet` interface.
- [ ] Add manual tests for connect, disconnect, sign transaction, and send transaction on devnet.

### 12. Final Verification

After manual testing, run:

```sh
pnpm typecheck
pnpm build
```
