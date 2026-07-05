---
title: "@vue-solana/nuxt"
description: Nuxt module for Solana applications.
surroundOrder: 16
---

[`@vue-solana/nuxt`](https://www.npmjs.com/package/@vue-solana/nuxt) installs the Vue Solana plugin in Nuxt apps and auto-imports composables.

## Install

```sh
npx nuxt module add @vue-solana/nuxt
```

This installs the package and adds `@vue-solana/nuxt` to the `modules` array in `nuxt.config.ts`.

Browser apps that create or serialize transactions can initialize the Buffer polyfill from `@vue-solana/nuxt/buffer-polyfill` and import supported Solana primitives from `@vue-solana/nuxt/web3`.

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

Mobile wallet options are safe to configure in `nuxt.config.ts` when they contain only JSON-serializable app identity and redirect settings:

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
    mobileWallet: {
      appIdentity: {
        name: "My Nuxt Solana App",
        uri: "https://example.com",
        icon: "favicon.ico",
      },
    },
    iosWallet: {
      appIdentity: {
        name: "My Nuxt Solana App",
      },
      redirectUrl: "https://example.com",
    },
  },
});
```

Pass `mobileWallet: false` or `iosWallet: false` to disable either mobile wallet source. The module also pre-optimizes common Solana, Wallet Adapter, and mobile wallet dependencies so Vite can bundle browser transaction and wallet code correctly.

## Auto-Imported Composables

The module auto-imports these composables from direct `@vue-solana/vue/*` subpaths rather than the root Vue package barrel. This keeps Nuxt SSR bundles from pulling in unrelated Solana runtime code just because a page uses one composable.

- `useSolana()`: returns the full injected Solana context.
- `useSolanaRpc()`: returns cluster, endpoint, RPC status, latest blockhash, and `checkConnection()`.
- `useSolanaConnection()`: returns the Solana `Connection` instance.
- `useSolanaAccountInfo(address, options?)`: reads account info and can subscribe to account changes.
- `useSolanaWallet()`: returns selected wallet state, connection state, capabilities, and wallet actions.
- `useSolanaWallets()`: returns discovered wallets and wallet selection/refresh actions.
- `useSolanaBalance(address, commitment?)`: reads lamport balance for a public key or address.
- `useSolanaProgramAccounts(programId, options?)`: reads program-owned accounts with filters and data slicing.
- `useSolanaTransactionConfirmation(options?)`: confirms an existing transaction signature.
- `useSolanaSignatureStatus(signature, options?)`: reads, polls, or subscribes to signature status.
- `useSolanaSignMessage()`: signs off-chain authentication or ownership challenge messages.
- `useSolanaSignAndSendTransaction()`: signs, sends, and optionally confirms transactions.

These are Nuxt aliases for the Vue composables. Use the Nuxt names inside Nuxt apps so auto-imports work without explicit imports.

Raw Solana primitives and the browser Buffer helper are explicit imports, not auto-imports:

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/nuxt/buffer-polyfill";
import { PublicKey, Transaction } from "@vue-solana/nuxt/web3";
```

Use direct `@vue-solana/core/*` imports only for lower-level core usage.

Direct package subpaths:

- `@vue-solana/nuxt/buffer-polyfill`
- `@vue-solana/nuxt/web3`

The runtime plugin is client-only. Auto-imported composables can be called during SSR and return inert state until hydration provides the real client context. Trigger RPC and wallet work from client lifecycle hooks or user actions.

Android Mobile Wallet Adapter registration also runs only on the client. On Android Chrome and Chrome PWAs, `Mobile Wallet Adapter` can appear in the same `useSolanaWallets()` list as browser extension wallets. On iOS browsers, Phantom, Solflare, and Backpack can appear in the same list through wallet-specific universal links. Desktop native app wallet adapters are planned but not implemented yet.

## Related Guides

- [RPC and Clusters](/guides/rpc-and-clusters): configure the Nuxt module and read RPC state.
- [Wallets](/guides/wallets): use `useSolanaWallets()` and `useSolanaWallet()` safely in client flows.
- [Account Reads](/guides/account-reads): read balances, account data, program accounts, and signature status.
- [Transactions](/guides/transactions): sign, send, confirm, and handle transaction status from Nuxt.
- [Message Signing](/guides/message-signing): request wallet signatures for off-chain messages.
- [Errors](/guides/errors): map auto-imported composable errors to safe UI messages.

## Read RPC State

```vue
<script setup lang="ts">
const { cluster, endpoint, status, error, latestBlockhash, checkConnection } = useSolanaRpc();

const rpcErrorMessage = computed(() => {
  if (!error.value) return null;
  return error.value.code === "RPC_FAILURE"
    ? "Unable to reach the configured Solana RPC endpoint."
    : "Unable to check the Solana connection.";
});
</script>

<template>
  <section>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Status: {{ status }}</p>
    <p>Latest blockhash: {{ latestBlockhash }}</p>
    <p v-if="rpcErrorMessage">{{ rpcErrorMessage }}</p>
    <button type="button" @click="checkConnection">Check RPC</button>
  </section>
</template>
```

## Read Balance

```vue
<script setup lang="ts">
const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useSolanaBalance(address);

const balanceErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana address.";
    case "RPC_FAILURE":
      return "Unable to load the balance from RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Lamports: {{ balance }}</p>
    <p v-if="loading">Loading...</p>
    <p v-if="balanceErrorMessage">{{ balanceErrorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

## Error Handling

Nuxt auto-imported composables expose the same normalized `SolanaError | null` refs as `@vue-solana/vue`. Use stable `error.value.code` values for UI branches and keep `error.value.cause` for logging original wallet, RPC, parsing, timeout, or storage failures.

```vue
<script setup lang="ts">
const { error, execute } = useSolanaSignAndSendTransaction();

const message = computed(() => {
  switch (error.value?.code) {
    case "NO_WALLET_SELECTED":
      return "Choose a wallet first.";
    case "USER_REJECTED":
      return "The wallet request was rejected.";
    case "TRANSACTION_TIMEOUT":
      return "The transaction is taking longer than expected.";
    case "RPC_FAILURE":
      return "The Solana RPC request failed.";
    default:
      return null;
  }
});
</script>
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
const { wallets, selectedWallet, refreshWallets, selectWallet } = useSolanaWallets();
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

Browser extension wallets are discovered through the Solana Wallet Standard. Android Mobile Wallet Adapter wallets are registered through `@solana-mobile/wallet-standard-mobile` on supported Android Chrome clients and exposed through the same wallet list. iOS Phantom, Solflare, and Backpack entries are exposed through wallet-specific universal links on iOS browsers. `refreshWallets()` only updates the discovered wallet list, and `selectWallet()` only configures the active wallet. `connected` remains false until `connect()` succeeds, even if the extension exposes previously authorized accounts after a page refresh.

## Message Signing

```vue
<script setup lang="ts">
const { connected, canSignMessage } = useSolanaWallet();
const { signature, status, error, execute } = useSolanaSignMessage();

if (connected.value && canSignMessage.value) {
  await execute(new TextEncoder().encode("Sign in to example.com"));
}
</script>
```

Message signing is for wallet ownership or authentication challenges. It is not transaction signing and does not authorize on-chain state changes. Wallets that do not expose message signing report `canSignMessage` as false and `execute()` rejects with an unsupported-wallet error.

## Sign, Send, And Confirm A Transaction

Use `useSolanaSignAndSendTransaction()` from a client-side user action when the connected wallet should sign and submit a transaction. Pass `confirm: true` when the UI should wait for confirmation instead of stopping after signature submission.

```vue
<script setup lang="ts">
import { Transaction } from "@vue-solana/nuxt/web3";

const { connected, canSignTransaction } = useSolanaWallet();
const { signature, confirmation, status, loading, error, execute } =
  useSolanaSignAndSendTransaction();

const canSubmit = computed(() => connected.value && canSignTransaction.value && !loading.value);

async function submitTransaction() {
  const transaction = new Transaction();
  // Add instructions, recent blockhash, and fee payer before requesting a wallet signature.
  await execute(transaction, {
    confirm: true,
    confirmation: { commitment: "confirmed", timeoutMs: 120_000 },
  });
}
</script>

<template>
  <section>
    <button type="button" :disabled="!canSubmit" @click="submitTransaction">
      Send transaction
    </button>
    <p>Status: {{ status }}</p>
    <p v-if="signature">Submitted: {{ signature }}</p>
    <p v-if="confirmation">Confirmed at {{ confirmation.commitment }}</p>
    <p v-if="error">Unable to complete the transaction.</p>
  </section>
</template>
```

Status moves from `sending` to `sent` after RPC submission. When confirmation is enabled it then moves through `confirming` and ends at the reached commitment, such as `confirmed` or `finalized`. If confirmation times out after submission, `signature` remains available so the app can show an explorer link or poll signature status before retrying.

Wallet prompts must be triggered by user interaction after hydration. Do not call `execute()` during SSR, in server routes, or automatically on page load.

## Confirm An Existing Signature

Use `useSolanaTransactionConfirmation()` when you already have a signature and want reactive confirmation state.

```vue
<script setup lang="ts">
const signature = ref("PASTE_TRANSACTION_SIGNATURE");
const { confirmation, status, error, confirm } = useSolanaTransactionConfirmation({
  commitment: "confirmed",
  timeoutMs: 60_000,
});

async function confirmCurrentSignature() {
  await confirm(signature.value);
}
</script>

<template>
  <section>
    <button type="button" @click="confirmCurrentSignature">Confirm signature</button>
    <p>Status: {{ status }}</p>
    <p v-if="confirmation">Reached {{ confirmation.commitment }}</p>
    <p v-if="error">Unable to confirm the signature.</p>
  </section>
</template>
```

## Track Signature Status

Use `useSolanaSignatureStatus()` when you need ongoing status checks for a submitted signature. This is useful after a timeout because a transaction might still land after the UI stopped waiting.

```vue
<script setup lang="ts">
const signature = ref("PASTE_TRANSACTION_SIGNATURE");
const { status, loading, error, refresh, stopPolling, stopSubscription } = useSolanaSignatureStatus(
  signature,
  {
    pollIntervalMs: 2_000,
  },
);

onBeforeUnmount(() => {
  stopPolling();
  void stopSubscription();
});
</script>
```

For explorer links, use the configured cluster. Devnet links should include `?cluster=devnet`; mainnet links should not include a cluster query.

```ts
function explorerUrl(signature: string, cluster: string) {
  const suffix = cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}
```

## Example App

For a complete runnable Nuxt flow, see the [Nuxt example](/examples/nuxt).
