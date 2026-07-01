# @vue-solana/nuxt

Nuxt module for Solana applications.

Use this package in Nuxt apps that need the Vue Solana plugin installed automatically plus auto-imported composables for RPC, wallet state, message signing, and transactions.

New to Solana? Start with the official docs and the project concepts guide:

- [Solana Documentation](https://solana.com/docs)
- [Solana RPC Methods](https://solana.com/docs/rpc)
- [Solana Clusters](https://solana.com/docs/references/clusters)
- [Vue Solana Concepts Guide](https://vue-solana-docs.vercel.app/concepts/solana-for-vue-developers)
- [`@vue-solana/nuxt` docs](https://vue-solana-docs.vercel.app/packages/nuxt)
- [Agent Skill](https://vue-solana-docs.vercel.app/agent-skill)
- [Live demo](https://vue-solana-docs.vercel.app/demo)

## Install

```sh
pnpm add @vue-solana/nuxt @vue-solana/vue @vue-solana/core @solana/web3-compat buffer
```

```sh
npm install @vue-solana/nuxt @vue-solana/vue @vue-solana/core @solana/web3-compat buffer
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

Nuxt module options are stored in public runtime config, so they must be JSON-serializable. Custom `wallet` adapter objects are intentionally excluded from Nuxt config; use the Vue plugin directly in client-only Vue code if you need to inject a custom wallet object.

For development, use `devnet` and request free test SOL from the official faucet:

```txt
https://faucet.solana.com
```

## Auto-Imported Composables

The module auto-imports these composables from direct `@vue-solana/vue/*` subpaths rather than the root Vue package barrel. This keeps Nuxt SSR bundles from pulling in unrelated Solana runtime code just because a page uses one composable.

- `useSolana()`
- `useSolanaRpc()`
- `useSolanaConnection()`
- `useSolanaAccountInfo()`
- `useSolanaWallet()`
- `useSolanaWallets()`
- `useSolanaBalance()`
- `useSolanaProgramAccounts()`
- `useSolanaTransactionConfirmation()`
- `useSolanaSignatureStatus()`
- `useSolanaSignMessage()`
- `useSolanaSignAndSendTransaction()`

The runtime plugin is client-only. Auto-imported composables can be called during SSR and return inert state until hydration provides the real client context. Trigger RPC and wallet work from client lifecycle hooks or user actions.

Android Mobile Wallet Adapter registration also runs only on the client. On Android Chrome and Chrome PWAs, `Mobile Wallet Adapter` can appear in the same `useSolanaWallets()` list as browser extension wallets. On iOS browsers, Phantom, Solflare, and Backpack can appear in the same list through wallet-specific universal links. Desktop native app wallet adapters are planned but not implemented yet.

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

## Read Account Data

```vue
<script setup lang="ts">
const address = ref("PASTE_A_SOLANA_ADDRESS");
const programId = ref("PASTE_A_SOLANA_PROGRAM_ID");
const signature = ref("PASTE_A_TRANSACTION_SIGNATURE");

const account = useSolanaAccountInfo(address, { watch: true });
const programAccounts = useSolanaProgramAccounts(programId, {
  dataSlice: { offset: 0, length: 32 },
  filters: [{ dataSize: 165 }],
});
const signatureStatus = useSolanaSignatureStatus(signature, { pollIntervalMs: 2_000 });
</script>
```

Use `useSolanaProgramAccounts()` carefully on public RPC nodes. Prefer narrow filters, use `dataSlice` for partial reads, and avoid polling broad scans.

## Wallet State

```vue
<script setup lang="ts">
const { wallets, selectedWallet, selectWallet, refreshWallets } = useSolanaWallets();
const { publicKey, connected, canSignMessage, connect, disconnect } = useSolanaWallet();
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
    <button type="button" :disabled="!selectedWallet || connected" @click="connect">Connect</button>
    <button type="button" :disabled="!connected" @click="disconnect">Disconnect</button>
  </section>
</template>
```

Browser extension wallets are discovered through the Solana Wallet Standard. Android Mobile Wallet Adapter wallets are registered through `@solana-mobile/wallet-standard-mobile` on supported Android Chrome clients and exposed through the same wallet list. Wallet actions work after selecting a discovered wallet or configuring a custom `SolanaWallet`.

Selected discovered wallets are persisted under `localStorage["vue-solana:selected-wallet"]` as non-sensitive identity metadata: `name`, and `platform`/`source` when available. On reload, Vue Solana restores the selected wallet if the same wallet is discovered again. Set `solana.autoConnect: true` to opt into calling `connect()` for that restored wallet; arbitrary installed wallets are never auto-connected. Calling `selectWallet(null)` or `setWallet(customWallet)` clears the stored selection.

## Message Signing

```vue
<script setup lang="ts">
const { connected, canSignMessage } = useSolanaWallet();
const { signature, status, error, execute } = useSolanaSignMessage();

async function signIn() {
  const message = new TextEncoder().encode("Sign in to My Nuxt Solana App");
  await execute(message);
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

Message signing is for wallet ownership or authentication challenges. It is separate from transaction signing and does not authorize on-chain activity. For auth flows, use a server-issued nonce and verify the returned signature server-side.

## Example App

This README includes small snippets for quick reference. For a complete runnable Nuxt flow, see the example app:

```sh
pnpm dev:nuxt
```

Docs: <a href="https://vue-solana-docs.vercel.app/examples/nuxt" target="_blank" rel="noopener noreferrer"><code>examples/nuxt</code></a>

Live demo: [vue-solana-docs.vercel.app/demo](https://vue-solana-docs.vercel.app/demo)

## AI Agent Skill

If you use an AI coding agent, install the Vue Solana Agent Skill for Nuxt module setup, auto-imported composables, SSR caveats, wallet flow guidance, and transaction gotchas:

```sh
npx skills add vue-solana/vue-solana --skill vue-solana
```

Docs: [Vue Solana Agent Skill](https://vue-solana-docs.vercel.app/agent-skill)

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

This package is early-stage. RPC, balance, browser extension wallet, Android mobile wallet, iOS browser wallet, message signing, and transaction composables are usable in Nuxt apps.
