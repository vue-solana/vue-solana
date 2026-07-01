# @vue-solana/vue

Vue plugin and composables for Solana applications.

Use this package in Vue 3 apps that need Solana RPC access, balance reads, wallet state, message signing, and transaction helper state.

New to Solana? Start with the official docs and the project concepts guide:

- [Solana Documentation](https://solana.com/docs)
- [Solana RPC Methods](https://solana.com/docs/rpc)
- [Solana Clusters](https://solana.com/docs/references/clusters)
- [Vue Solana Concepts Guide](https://vue-solana-docs.vercel.app/concepts/solana-for-vue-developers)
- [`@vue-solana/vue` docs](https://vue-solana-docs.vercel.app/packages/vue)
- [Agent Skill](https://vue-solana-docs.vercel.app/agent-skill)
- [Live demo](https://vue-solana-docs.vercel.app/demo)

## Install

```sh
pnpm add @vue-solana/vue @vue-solana/core @solana/web3-compat buffer
```

```sh
npm install @vue-solana/vue @vue-solana/core @solana/web3-compat buffer
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
      mobileWallet: {
        appIdentity: {
          name: "My Vue Solana App",
          uri: "https://example.com",
          icon: "favicon.ico",
        },
      },
    }),
  )
  .mount("#app");
```

Android Mobile Wallet Adapter registration is enabled by default on supported Android Chrome clients. Pass `mobileWallet` options to customize the MWA app identity, or pass `mobileWallet: false` to disable Android mobile wallet registration.

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

The root export remains supported. For composables, prefer direct subpath imports in new code so bundlers can avoid evaluating unrelated package entry code:

```ts
import { useRpc } from "@vue-solana/vue/useRpc";
import { useWallet } from "@vue-solana/vue/useWallet";
import { useSignMessage } from "@vue-solana/vue/useSignMessage";
```

For development, use `devnet` and request free test SOL from the official faucet:

```txt
https://faucet.solana.com
```

## Read RPC State

```vue
<script setup lang="ts">
import { useRpc } from "@vue-solana/vue/useRpc";

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
import { useBalance } from "@vue-solana/vue/useBalance";

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

## Read Account Data

```ts
import { useAccountInfo } from "@vue-solana/vue/useAccountInfo";
import { useProgramAccounts } from "@vue-solana/vue/useProgramAccounts";
import { useSignatureStatus } from "@vue-solana/vue/useSignatureStatus";

const account = useAccountInfo(address, { watch: true });
const programAccounts = useProgramAccounts(programId, {
  dataSlice: { offset: 0, length: 32 },
  filters: [{ dataSize: 165 }],
});
const signatureStatus = useSignatureStatus(signature, {
  pollIntervalMs: 2_000,
  searchTransactionHistory: true,
});
```

`useProgramAccounts()` can be expensive on public RPC nodes. Prefer narrow `filters`, use `dataSlice` when you only need part of account data, and avoid polling broad program scans.

## Wallet State

```vue
<script setup lang="ts">
import { useWallet } from "@vue-solana/vue/useWallet";
import { useWallets } from "@vue-solana/vue/useWallets";

const { wallets, selectedWallet, selectWallet, refreshWallets } = useWallets();
const { publicKey, connected, connecting, canSignMessage, connect, disconnect } = useWallet();
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
    <p>Can sign messages: {{ canSignMessage }}</p>
    <p v-if="connecting">Connecting...</p>
    <button type="button" :disabled="!selectedWallet || connected || connecting" @click="connect">
      Connect
    </button>
    <button type="button" :disabled="!connected" @click="disconnect">Disconnect</button>
  </section>
</template>
```

Browser extension wallets are discovered through the Solana Wallet Standard. Android Mobile Wallet Adapter wallets are registered through `@solana-mobile/wallet-standard-mobile` and exposed through the same `useWallets()` list on supported Android Chrome clients. iOS Phantom, Solflare, and Backpack entries are exposed through wallet-specific universal links on iOS browsers. `connect()` works after selecting a discovered wallet or configuring a custom `SolanaWallet`.

Selected discovered wallets are persisted under `localStorage["vue-solana:selected-wallet"]` as non-sensitive identity metadata: `name`, and `platform`/`source` when available. On reload, Vue Solana restores the selected wallet if the same wallet is discovered again. Pass `autoConnect: true` to opt into calling `connect()` for that restored wallet; arbitrary installed wallets are never auto-connected. Calling `selectWallet(null)` or `setWallet(customWallet)` clears the stored selection.

Desktop native app wallet adapters are planned but not implemented yet.

Composables return inert SSR-safe state when no plugin context is available. Real RPC and wallet operations still require the plugin-provided client context.

## Message Signing

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useSignMessage } from "@vue-solana/vue/useSignMessage";
import { useWallet } from "@vue-solana/vue/useWallet";

const { connected, canSignMessage } = useWallet();
const { signature, status, error, execute } = useSignMessage();

const message = computed(() => new TextEncoder().encode("Sign in to My Vue Solana App"));

async function signIn() {
  await execute(message.value);
}
</script>

<template>
  <section>
    <button type="button" :disabled="!connected || !canSignMessage" @click="signIn">
      Sign message
    </button>
    <p>Status: {{ status }}</p>
    <p v-if="signature">Signature bytes: {{ signature.length }}</p>
    <pre v-if="error">{{ error.message }}</pre>
  </section>
</template>
```

Message signing proves wallet ownership for flows like authentication challenges. It does not sign, submit, or authorize Solana transactions. For authentication, issue a server-generated nonce, include domain and expiration details in the message, and verify the returned signature server-side.

## Transaction State

```ts
import { useSignAndSendTransaction } from "@vue-solana/vue/useSignAndSendTransaction";

const { signature, confirmation, status, loading, error, execute } = useSignAndSendTransaction();

await execute(transaction, {
  confirm: true,
  confirmation: { commitment: "confirmed" },
  skipPreflight: false,
});
```

The current wallet must be connected and support either `signAndSendTransaction` or `signTransaction`. Android Mobile Wallet Adapter wallets prefer `signTransaction` plus app-side RPC submission when available. This avoids a mobile handoff edge case where the wallet sends successfully but the browser page does not receive the wallet adapter's returned signature.

Without `confirm: true`, `execute()` returns after submission and sets `status` to `sent`. With confirmation enabled, status moves through `sending`, `confirming`, and then `processed`, `confirmed`, or `finalized` to match the requested commitment. If confirmation times out or fails, the submitted `signature` remains available so the app can link to an explorer.

Use `useTransactionConfirmation()` when you already have a submitted signature and want to wait for confirmation separately:

```ts
import { useTransactionConfirmation } from "@vue-solana/vue/useTransactionConfirmation";

const confirmation = useTransactionConfirmation({ commitment: "finalized" });

await confirmation.confirm(signature);
```

`useSignAndSendTransaction()` also clears `loading` if a wallet adapter never returns a result. In that stale case, `error` is set and the chain status may be unknown, so check the connected wallet or an explorer before retrying.

## Example App

This README includes small snippets for quick reference. For a complete runnable Vue + Vite flow, see the example app:

```sh
pnpm dev:vue
```

Docs: <a href="https://vue-solana-docs.vercel.app/examples/vue-vite" target="_blank" rel="noopener noreferrer"><code>examples/vue-vite</code></a>

Live demo: [vue-solana-docs.vercel.app/demo](https://vue-solana-docs.vercel.app/demo)

## AI Agent Skill

If you use an AI coding agent, install the Vue Solana Agent Skill for plugin setup, composable imports, wallet flow guidance, transaction gotchas, and verification commands:

```sh
npx skills add vue-solana/vue-solana --skill vue-solana
```

Docs: [Vue Solana Agent Skill](https://vue-solana-docs.vercel.app/agent-skill)

## API

- `createSolanaPlugin(options?)`: installs the Vue Solana context.
- `VueSolana`: alias for `createSolanaPlugin`.
- `useSolana()`: returns the full injected Solana context.
- `useRpc()`: returns cluster, endpoint, connection status, latest blockhash, and `checkConnection()`.
- `useConnection()`: returns the Solana `Connection`.
- `useWallet()`: returns wallet refs, computed connection state, and wallet actions.
- `useWallets()`: returns discovered browser extension wallets, Android Mobile Wallet Adapter wallets, iOS browser wallet links, and wallet selection actions.
- `useSignMessage()`: signs arbitrary message bytes through the connected wallet when message signing is supported.
- `useBalance(address, commitment?)`: loads lamport balance for a `PublicKey` or address string.
- `useAccountInfo(address, options?)`: loads account info and can subscribe to account changes with `watch: true`.
- `useProgramAccounts(programId, config?)`: loads accounts owned by a program with optional filters, commitment, and `dataSlice`.
- `useTransaction(handler, options?)`: generic async transaction state helper with optional timeout settings.
- `useTransactionConfirmation(options?)`: confirms a submitted signature with reactive status and timeout/error state.
- `useSignatureStatus(signature, options?)`: reads a transaction signature status with optional polling or websocket subscription.
- `useSignAndSendTransaction()`: signs and sends a transaction through the configured wallet, with optional confirmation waiting.

Direct composable subpaths:

- `@vue-solana/vue/useSolana`
- `@vue-solana/vue/useRpc`
- `@vue-solana/vue/useConnection`
- `@vue-solana/vue/useAccountInfo`
- `@vue-solana/vue/useBalance`
- `@vue-solana/vue/useProgramAccounts`
- `@vue-solana/vue/useWallet`
- `@vue-solana/vue/useWallets`
- `@vue-solana/vue/useSignMessage`
- `@vue-solana/vue/useTransaction`
- `@vue-solana/vue/useTransactionConfirmation`
- `@vue-solana/vue/useSignatureStatus`
- `@vue-solana/vue/useSignAndSendTransaction`

## Known TypeScript Issue

`@solana/web3-compat@0.0.21` currently has broken TypeScript metadata. Runtime imports still use the real package, but TypeScript consumers may need a local declaration shim.

If TypeScript cannot resolve `@solana/web3-compat`, add `types/web3-compat.d.ts` to your app:

```ts
declare module "@solana/web3-compat" {
  export type {
    AccountInfo,
    Commitment,
    RpcResponseAndContext,
    SendOptions,
    SignatureResult,
    SignatureStatus,
    TransactionSignature,
  } from "@solana/web3.js";
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

This package is early-stage. RPC, balance, browser extension wallet, Android mobile wallet, iOS browser wallet, message signing, and transaction composables are usable.
