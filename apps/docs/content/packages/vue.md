---
title: "@vue-solana/vue"
description: Vue plugin and composables for Solana applications.
ogSection: Packages
surroundOrder: 15
---

[`@vue-solana/vue`](https://www.npmjs.com/package/@vue-solana/vue) provides a Vue plugin and composables for Solana RPC access, balance reads, wallet state, and transaction helper state.

## Install

```sh
pnpm add @vue-solana/vue
```

Browser apps that create or serialize transactions can initialize the Buffer polyfill from `@vue-solana/vue/buffer-polyfill`.

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

iOS browser wallet links are enabled by default on iOS browsers for Phantom, Solflare, and Backpack. Pass `iosWallet` options to customize app identity, redirect URL, chains, or cluster, or pass `iosWallet: false` to disable iOS wallet link discovery.

You can also pass a custom RPC endpoint:

```ts
createApp(App).use(
  createSolanaPlugin({
    cluster: "mainnet",
    endpoint: "https://your-rpc.example.com",
    commitment: "confirmed",
  }),
);
```

Supported clusters are `mainnet` (legacy alias `mainnet-beta`), `devnet`, `testnet`, and `localnet`. Use `mainnet` for Solana mainnet; this is Solana's official mainnet cluster name.

### Plugin Options

| Option           | Type                           | Default            | Description                                                                                          |
| ---------------- | ------------------------------ | ------------------ | ---------------------------------------------------------------------------------------------------- |
| `cluster`        | Solana cluster                 | `devnet`           | Cluster used when `endpoint` is omitted. `mainnet-beta` is accepted as a legacy alias for `mainnet`. |
| `endpoint`       | `string`                       | Cluster endpoint   | HTTP RPC endpoint.                                                                                   |
| `wsEndpoint`     | `string`                       | Derived endpoint   | WebSocket RPC endpoint.                                                                              |
| `commitment`     | Commitment                     | Kit default        | Default commitment for RPC calls.                                                                    |
| `autoConnect`    | `boolean`                      | `false`            | Reconnect only a previously selected discovered wallet.                                              |
| `payer`          | `TransactionSigner`            | None               | Client fee payer and signer for client-sent transactions.                                            |
| `payerSecretKey` | `string`                       | None               | Base64 64-byte Ed25519 keypair, secret key first, resolved as a signer at client creation.           |
| `wallet`         | `SolanaWallet`                 | Disabled           | Custom wallet adapter.                                                                               |
| `mobileWallet`   | `MobileWalletOptions \| false` | Enabled on Android | Android Mobile Wallet Adapter options.                                                               |
| `iosWallet`      | `iOSWalletOptions \| false`    | Enabled on iOS     | iOS wallet universal-link options.                                                                   |

`payer` and `payerSecretKey` are supported by direct Vue plugin/core clients. A client-sent transaction requires a `payer`. Never put a raw secret or `payerSecretKey` in Nuxt public runtime config, and never ship a funded signing key to an end-user browser.

The default client created by `createSolanaPlugin()` uses the official `solanaRpc()`, `rpcTransactionPlanner()`, and `rpcTransactionPlanSendingExecutor()` composition. The old custom fallback sender is not used. The official sending executor waits for `confirmed` commitment before `execute()` resolves and sets `status` to `sent`.

### Client and Plugin Lifecycle

`createSolanaPlugin()` builds the Kit client once, during `install()`. Create the plugin at module scope and reuse the instance:

```ts
// solana.ts
import { createSolanaPlugin } from "@vue-solana/vue";

export const solana = createSolanaPlugin({ cluster: "devnet" });
```

Calling `createSolanaPlugin()` again builds a new client and context, discarding the existing wallet selection and RPC state. If your config is reactive — a cluster toggle, for example — memoize on the config so a new plugin (and client) is built only when the value actually changes, not on every render:

```ts
import { computed, ref } from "vue";

const cluster = ref<SolanaCluster>("devnet");
const plugin = computed(() => createSolanaPlugin({ cluster: cluster.value }));
```

A Kit client runs its `createClient().use(...)` plugins during construction. When one of those plugins is async, the client — and any context built from it — only activates after that promise resolves. Defer real RPC and wallet work to client lifecycle hooks or user actions after hydration rather than running it during setup or SSR.

## Composables

The root export remains supported. For composables, prefer direct subpath imports in new code so bundlers can avoid evaluating unrelated package entry code:

```ts
import { useRpc } from "@vue-solana/vue/useRpc";
import { useWallet } from "@vue-solana/vue/useWallet";
```

Direct package subpaths:

- `@vue-solana/vue/buffer-polyfill`
- `@vue-solana/vue/useAction`
- `@vue-solana/vue/useAirdrop`
- `@vue-solana/vue/useRequest`
- `@vue-solana/vue/useSubscription`
- `@vue-solana/vue/useTrackedData`
- `@vue-solana/vue/useSignIn`
- `@vue-solana/vue/useSelectedWalletAccount`
- `@vue-solana/vue/useSignTransactions`
- `@vue-solana/vue/useSignAndSendTransactions`
- `@vue-solana/vue/useClientCapability`
- `@vue-solana/vue/usePayer`
- `@vue-solana/vue/useIdentity`
- `@vue-solana/vue/usePlanTransaction`
- `@vue-solana/vue/usePlanTransactions`
- `@vue-solana/vue/useSendTransaction`
- `@vue-solana/vue/useSendTransactions`
- `@vue-solana/vue/swr`
- `@vue-solana/vue/useSolana`
- `@vue-solana/vue/useSolanaClient`
- `@vue-solana/vue/useRpc`
- `@vue-solana/vue/useConnection`
- `@vue-solana/vue/useAccountInfo`
- `@vue-solana/vue/useBalance`
- `@vue-solana/vue/useProgramAccounts`
- `@vue-solana/vue/useWallet`
- `@vue-solana/vue/useWallets`
- `@vue-solana/vue/useTransaction`
- `@vue-solana/vue/useTransactionConfirmation`
- `@vue-solana/vue/useSignatureStatus`
- `@vue-solana/vue/useSignMessage`
- `@vue-solana/vue/useSignAndSendTransaction`
- `@vue-solana/vue/useTokenBalance`
- `@vue-solana/vue/useTokenAccounts`
- `@vue-solana/vue/kit`

Use `@vue-solana/vue/buffer-polyfill` for browser transaction code that needs the Buffer polyfill. Use `@vue-solana/vue/kit` for the Kit API (`createSolanaClient`, `address`, `lamports`, and types). Direct `@vue-solana/core/*` imports remain supported for lower-level core usage.

- `useSolana()`: returns the full injected Solana context.
- `useSolanaClient()`: returns the Kit `{ client, rpc }` from the context. Recommended for new code.
- `useRpc()`: returns cluster, endpoint, connection status, latest blockhash, the injected Kit `client`, and `checkConnection()`.
- `useConnection()`: returns the injected Kit client (deprecated in favor of `useSolanaClient()`).
- `useAccountInfo(address, options?)`: loads normalized account data (executable, lamports, owner, space, data bytes).
- `useProgramAccounts(programId, options?)`: loads accounts owned by a program id with optional filters and data slicing.
- `useWallet()`: returns active wallet refs, computed connection state, and wallet actions.
- `useWallets()`: returns discovered browser extension wallets, Android Mobile Wallet Adapter wallets, supported iOS browser wallet entries, and wallet selection actions.
- `useBalance(address, commitment?)`: loads lamport balance for an address string.
- `useAirdrop()`: airdrops SOL into an account on test networks and local validators.
- `useTokenAccounts(owner, options?)`: loads all SPL token accounts for an owner, querying both Token and Token-2022 programs by default.
- `useTokenBalance(mint, owner)`: loads the SPL token balance and decimals for a mint/owner pair via the associated token account.
- `useTransaction(handler, options?)`: generic async transaction state helper with optional timeout settings.
- `useTransactionConfirmation(options?)`: confirms a submitted signature with reactive status and timeout/error state.
- `useSignatureStatus(signature, options?)`: reads, polls, or subscribes to signature status updates.
- `useSignMessage()`: signs arbitrary authentication messages through the configured wallet when supported.
- `useSignAndSendTransaction()`: signs and sends a transaction through the configured wallet, with optional confirmation waiting.
- `useAction(handler)`: generic async action state machine with abort-on-redispatch; the foundation for the data composables.
- `useRequest(source, options?)`: one-shot async request that re-fires when its source changes, with stale-while-revalidate.
- `useSubscription(source, options?)`: live data from RPC subscriptions and other reactive stream sources.
- `useTrackedData(source, options?)`: RPC subscription seeded by a one-shot fetch, slot-deduplicated.
- `useSignIn()`: triggers a wallet's Sign In With Solana (SIWS) feature.
- `useSelectedWalletAccount()`: reads the app-wide selected wallet account from `SelectedWalletAccountProvider` (or `provideSelectedWalletAccount()`).
- `useSignTransactions()`: signs multiple serialized transactions in one wallet request.
- `useSignAndSendTransactions()`: signs and sends multiple transactions in one wallet request.
- `useClientCapability(capability)`: asserts a capability is installed on the Kit client, failing fast with a clear error.
- `usePayer()` / `useIdentity()`: reactively track the fee payer / acting identity signer from the Kit client.
- `usePlanTransaction()` / `usePlanTransactions()`: plan transaction messages from instruction inputs without sending.
- `useSendTransaction()` / `useSendTransactions()`: use the official Kit planner and RPC plan-sending executor installed by `createSolanaClient()`; they plan, sign, submit, and wait for `confirmed` commitment with no wallet popup. Configure `payer`.

## Related Guides

- [RPC and Clusters](/guides/rpc-and-clusters): read connection state and configure endpoints.
- [Wallets](/guides/wallets): discover, select, connect, disconnect, and check wallet capabilities.
- [Account Reads](/guides/account-reads): read balances, account info, program accounts, and signature status.
- [Transactions](/guides/transactions): sign, send, confirm, and show transaction progress.
- [Message Signing](/guides/message-signing): sign off-chain authentication or ownership challenges.
- [E2E Testing](/guides/e2e-testing): mock RPC, RPC subscriptions, and wallets in Playwright tests.
- [Errors](/guides/errors): map composable `error` refs to safe UI messages.

## Read RPC State

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useRpc } from "@vue-solana/vue/useRpc";

const { cluster, endpoint, status, error, latestBlockhash, checkConnection } = useRpc();

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

## Use The Kit Client

```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { client, rpc } = useSolanaClient();
const slot = ref<bigint>();

async function checkSlot() {
  slot.value = await rpc.getSlot().send();
}

onMounted(checkSlot);
</script>

<template>
  <section>
    <p>Slot: {{ slot }}</p>
    <button type="button" @click="checkSlot">Check Slot</button>
  </section>
</template>
```

`useSolanaClient()` returns the same context as `useSolana()` but shapes it for Kit reads: `client` is the full `@solana/kit` client and `rpc` is its read API. RPC results are `bigint` and account data is `Uint8Array`. See [Kit Migration](/guides/kit-migration).

## Read Balance

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useBalance } from "@vue-solana/vue/useBalance";

const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useBalance(address);

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

## Read Token Accounts

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useTokenAccounts } from "@vue-solana/vue/useTokenAccounts";

const owner = ref("PASTE_A_SOLANA_ADDRESS");
const { tokenAccounts, loading, error, refresh } = useTokenAccounts(owner);

const tokenErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana address.";
    case "RPC_FAILURE":
      return "Unable to load token accounts from RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Token accounts: {{ tokenAccounts.length }}</p>
    <ul>
      <li v-for="(account, i) in tokenAccounts" :key="i">
        {{ account.mint }} — {{ account.amount }}
      </li>
    </ul>
    <p v-if="loading">Loading...</p>
    <p v-if="tokenErrorMessage">{{ tokenErrorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

`useTokenAccounts()` clears state without calling RPC when the owner is null. Pass `programId` in the options to limit results to a single token program.

## Read Token Balance

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useTokenBalance } from "@vue-solana/vue/useTokenBalance";

const mint = ref("PASTE_A_MINT_ADDRESS");
const owner = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, decimals, loading, error, refresh } = useTokenBalance(mint, owner);

const tokenBalanceErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter valid mint and owner addresses.";
    case "RPC_FAILURE":
      return "Unable to load token balance from RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p v-if="balance !== null">Balance: {{ balance }} ({{ decimals }} decimals)</p>
    <p v-else>No token account found.</p>
    <p v-if="loading">Loading...</p>
    <p v-if="tokenBalanceErrorMessage">{{ tokenBalanceErrorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

`useTokenBalance()` returns `null` balance and decimals when the associated token account does not exist, without treating it as an error.

## Error Handling

Composable `error` refs use `SolanaError | null` from `@vue-solana/core/errors`. Branch on `error.value.code` for user-facing UI and keep `error.value.cause` for debugging original wallet, RPC, address parsing, timeout, or storage failures.

```ts
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

watchEffect(() => {
  if (error.value?.cause) {
    console.debug("Original Solana error", error.value.cause);
  }
});
```

## Read Account Info

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useAccountInfo } from "@vue-solana/vue/useAccountInfo";

const address = ref("PASTE_A_SOLANA_ADDRESS");
const { accountInfo, loading, error, refresh, stopWatching } = useAccountInfo(address, {
  commitment: "confirmed",
  watch: true,
});

const accountInfoErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana address.";
    case "RPC_FAILURE":
      return "Unable to load account data from RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Lamports: {{ accountInfo?.lamports ?? "Unknown" }}</p>
    <p v-if="loading">Loading...</p>
    <p v-if="accountInfoErrorMessage">{{ accountInfoErrorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
    <button type="button" @click="stopWatching">Stop watching</button>
  </section>
</template>
```

`useAccountInfo()` clears state without calling RPC when the address is null. Invalid address strings clear stale `accountInfo`, set `error`, and do not call `getAccountInfo()`. When `watch: true` is enabled, the websocket listener is removed automatically on component unmount. Calling `stopWatching()` removes the current listener and prevents automatic restarts for that composable instance.

## Read Program Accounts

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useProgramAccounts } from "@vue-solana/vue/useProgramAccounts";

const programId = ref("PASTE_A_SOLANA_PROGRAM_ID");
const { accounts, loading, error, refresh } = useProgramAccounts(programId, {
  commitment: "confirmed",
  filters: [{ dataSize: 165 }],
  dataSlice: { offset: 0, length: 32 },
});

const programAccountsErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana program id.";
    case "RPC_FAILURE":
      return "Unable to load program accounts from RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Accounts: {{ accounts.length }}</p>
    <p v-if="loading">Loading...</p>
    <p v-if="programAccountsErrorMessage">{{ programAccountsErrorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

`useProgramAccounts()` clears state without calling RPC when the program id is null. Invalid program id strings clear stale `accounts`, set `error`, and do not call `getProgramAccounts()`.

> Warning: `useProgramAccounts()` can be expensive. Each refresh may scan a large program-owned account set, consume significant RPC credits, hit provider rate limits, or time out. Do not run broad scans from high-traffic UI paths. Use narrow filters, `dataSlice`, caching, indexing, pagination strategies, or dedicated RPC infrastructure for production reads.

## Wallet State

```vue
<script setup lang="ts">
import { useWallet } from "@vue-solana/vue/useWallet";
import { useWallets } from "@vue-solana/vue/useWallets";

const { wallets, selectedWallet, refreshWallets, selectWallet } = useWallets();
const { publicKey, connected, connecting, connect, disconnect } = useWallet();
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
    <p>Public key: {{ publicKey }}</p>
    <p v-if="connecting">Connecting...</p>
    <button type="button" :disabled="!selectedWallet || connected || connecting" @click="connect">
      Connect
    </button>
    <button type="button" :disabled="!connected" @click="disconnect">Disconnect</button>
  </section>
</template>
```

Browser extension wallets are discovered through the Solana Wallet Standard. Android Mobile Wallet Adapter wallets are registered through `@solana-mobile/wallet-standard-mobile` and exposed through the same `useWallets()` list on supported Android Chrome clients. iOS Phantom, Solflare, and Backpack entries are exposed through wallet-specific universal links on iOS browsers. `refreshWallets()` only updates the discovered wallet list, and `selectWallet()` only configures the active wallet. `connected` remains false until `connect()` succeeds, even if the extension exposes previously authorized accounts after a page refresh.

Desktop native app wallet adapters are not implemented yet. Desktop native support requires wallet-specific protocol links or future native Wallet Standard registration.

Composables return inert SSR-safe state when no plugin context is available. Real RPC and wallet operations still require the plugin-provided client context.

## Message Signing

```ts
import { useSignMessage } from "@vue-solana/vue/useSignMessage";
import { useWallet } from "@vue-solana/vue/useWallet";

const { connected, canSignMessage } = useWallet();
const { signature, status, error, execute } = useSignMessage();

if (connected.value && canSignMessage.value) {
  await execute(new TextEncoder().encode("Sign in to example.com"));
}
```

Message signing is for wallet ownership or authentication challenges. It is not transaction signing and does not authorize on-chain state changes. Wallets that do not expose message signing report `canSignMessage` as false and `execute()` rejects with an unsupported-wallet error.

## Sign In With Solana

```ts
import { useSignIn } from "@vue-solana/vue/useSignIn";

const { signInResult, status, loading, error, signIn } = useSignIn();

async function handleSignIn() {
  const { account, signedMessage, signature } = await signIn({
    statement: "Sign in to My App",
    // Generate the nonce server-side and verify it on the server.
    nonce: await fetchNonceFromBackend(),
  });

  // Send { account.address, signature, signedMessage } to your backend for
  // verification before creating a session.
}
```

The wallet must support the SIWS feature (`canSignIn` is false otherwise, and `signIn()` rejects with a `WALLET_FEATURE_UNSUPPORTED` error). The sign-in uses the wallet's currently selected account; if no wallet is connected, `signIn()` rejects with a `WALLET_NOT_CONNECTED` error — connect first, the composable does not do it for you.

### Verifying the signature on your server

The wallet returns a signature over `signedMessage` — the SIWS message the user consented to. Trusting the result without verification would let a malicious client forge an identity, so verify server-side before issuing a session:

1. **Check the message**: decode `signedMessage` and confirm the domain matches your origin, the `uri` is yours, the `nonce` matches the one your server issued for this session, and the statement/resources match what you expect.
2. **Verify the signature**: the signature is an Ed25519 signature of the SIWS message bytes. Verify it with `tweetnacl` (`nacl.sign.detached.verify(signedMessage, signature, account.publicKey)`) or any Ed25519 library, against the account's `publicKey` from the sign-in result.
3. **Bind the session**: only after the message checks and the signature verifies should you create the session — keyed to `account.address`.

The server must re-derive the expected message from the nonce it issued (or validate every field of the received message) so expired or replayed nonces are rejected.

## Data Fetching Composables

`useRequest`, `useSubscription`, and `useTrackedData` are the SWR-style data layer, built on the Kit reactive-store primitives:

```ts
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";
import { useTrackedData } from "@vue-solana/vue/useTrackedData";
import { address } from "@vue-solana/vue/kit";

const { rpc, rpcSubscriptions } = useSolanaClient().client;
const someAddress = address("...");

const { data, status, refresh } = useTrackedData({
  rpcRequest: rpc.getBalance(someAddress),
  rpcValueMapper: (lamports) => lamports,
  rpcSubscriptionRequest: rpcSubscriptions.accountNotifications(someAddress),
  rpcSubscriptionValueMapper: ({ lamports }) => lamports,
});

// data.value is a SolanaRpcResponse envelope: data.value.value and
// data.value.context.slot.
```

- `useRequest` re-fires when a ref/computed source changes identity; passing `null` disables it (status `disabled`).
- `useSubscription` keeps the stale value while reconnecting; `reconnect()` re-opens the stream.
- `useTrackedData` slot-deduplicates the fetch and subscription so out-of-order arrivals cannot regress the value.

The `rpcValueMapper` and `rpcSubscriptionValueMapper` callbacks receive the **unwrapped** response value (`value.lamports` for a balance), while the returned `data` ref keeps the full `SolanaRpcResponse` envelope so you can read `data.value?.context.slot`.

### One-Shot Requests With `useRequest`

`useRequest` is the general-purpose SWR request. It accepts a request function, a Kit request object (anything with `send()`), or a `ref`/`computed` of either, or `null` to disable:

```ts
import { computed } from "vue";
import { useRequest } from "@vue-solana/vue/useRequest";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { rpc } = useSolanaClient();
const someAddress = ref("...");

const { data, error, status, refresh } = useRequest(
  computed(() => (someAddress.value ? rpc.getBalance(someAddress.value) : null)),
  {
    // Optional per-attempt cancellation composed with the internal signal.
    getAbortSignal: () => AbortSignal.timeout(5_000),
  },
);

// data.value is the raw response value; status is
// "fetching" | "success" | "error" | "disabled".
```

While a revalidation runs, the previous `data` and `error` stay populated, so the UI keeps rendering. `refresh()` re-fires manually and resolves with the attempt result.

### Streams With `useSubscription`

`useSubscription` consumes any Kit reactive stream source (duck-typed on `reactiveStore()`), tears the connection down on unmount, and supports manual reconnection with stale-while-revalidate:

```ts
import { useSubscription } from "@vue-solana/vue/useSubscription";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { rpcSubscriptions } = useSolanaClient().client;

const { data, error, status, reconnect } = useSubscription(
  computed(() => (someAddress.value ? rpcSubscriptions.slotNotifications() : null)),
  { onError: (cause) => console.error(cause) },
);

// Status is "loading" | "loaded" | "error" | "disabled".
// reconnect() re-opens the stream while data keeps the last known value.
```

Errors preserve the last known `data`; a `null` source disables the subscription and clears state.

### Cache Keying Across Mounts

```ts
import {
  useRequestSwr,
  useSubscriptionSwr,
  useTrackedDataSwr,
  clearSwrCache,
} from "@vue-solana/vue/swr";

const balance = useRequestSwr(`balance:${someAddress}`, rpc.getBalance(someAddress));
```

Components mounted with the same key seed from the last-known value while their own request revalidates. There is no `useAction` adapter — actions are mutations, not cacheable reads; use the mutation API of your data layer (or `useAction` itself).

Cache behavior details:

- Keys are namespaced per adapter (`request:`, `subscription:`, `tracked:`), so the same key is safe across adapters.
- A `null`/`undefined` source disables the composable and **clears** the cached entry for that key — including when a component mounts with its source already disabled.
- `useTrackedDataSwr` caches the full `SolanaRpcResponse` envelope, so remounting components restore both the value and its slot context.
- The cache is a module-level `Map`. On the server, namespace keys per request or call `clearSwrCache()` between requests to avoid cross-request leakage.

For a runnable demonstration of all five composables (including SWR remount behavior) against devnet, see the Live Data Panels in the [Vue Vite example](/examples/vue-vite).

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

`useSignAndSendTransaction()` also clears `loading` if a wallet adapter never returns a result. In that stale case, `error` is set and the chain status may be unknown, so check the connected wallet or an explorer before retrying.

### Wallet Request Inputs and Returns

Wallet signing flows accept transaction input as raw `Uint8Array` wire bytes that conform to the Solana transaction schema. Build them with `@solana/kit` (or decode them from a base64/base58 RPC response); base64 strings, transaction objects, and instruction lists are not accepted here.

```ts
import { compileTransaction, getTransactionEncoder } from "@solana/kit";

const transaction: Uint8Array = getTransactionEncoder().encode(compileTransaction(message));
await execute(transaction);
```

`useSignMessage()` takes the raw message bytes to sign. Every wallet send request also accepts the Kit `SendTransactionOptions`:

| Option                | Description                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| `skipPreflight`       | Skip preflight simulation before sending.                                                                     |
| `maxRetries`          | RPC node retry count (`bigint`).                                                                              |
| `minContextSlot`      | Slot at which any blockhash or nonce in the transaction is known to exist; sending before it can be rejected. |
| `preflightCommitment` | Commitment used for preflight simulation.                                                                     |

Return shapes:

- `useSignMessage().execute(bytes)` resolves to `{ signedMessage, signature }`, both `Uint8Array`.
- `useSignTransactions().execute(transactions)` resolves to the signed `Uint8Array[]` (also exposed as `signedTransactions`); pass a single-element array for one transaction.
- `useSignAndSendTransaction().execute(transaction)` resolves to the submitted `signature` string; with `confirm: true` it also fills `confirmation`.
- `useSignAndSendTransactions().execute(transactions)` resolves to a `string[]` of signatures (also exposed as `signatures`).

A wallet may modify the message or transaction before signing — for example to add its own instruction or change the fee payer — and the Wallet Standard explicitly allows it. Re-read the returned `signedMessage` or signed transaction bytes instead of assuming they match your input byte-for-byte.

### Client-Sent Transactions

`useSendTransaction()` and `useSendTransactions()` use the client's transaction-sending capability instead of the connected wallet. `createSolanaClient()` and `createSolanaPlugin()` install the official `solanaRpc()`, `rpcTransactionPlanner()`, and `rpcTransactionPlanSendingExecutor()` stack by default, so these composables do not require a custom fallback or a second manual plugin installation.

The executor reads a fresh blockhash, estimates or respects resource limits, performs preflight simulation unless configured otherwise, signs with the client signers, submits over RPC, and waits for `confirmed` commitment. `status` changes from `sending` to `sent` only after that send-and-confirm operation completes. A single result exposes `data.context.signature`; a batch result contains the plan result tree. There is no wallet popup, so use this path only when the client owns an appropriate signer.

Configure a `payer` directly in a Vue/core client with `payer` or `payerSecretKey`; a client with no payer cannot plan or send. A server or relayer should own funded production keys. Do not put a raw secret or `payerSecretKey` in Nuxt public runtime config, and do not ship a funded keypair to an end-user browser.

The wallet composables remain separate: `useSignAndSendTransaction()` can return after RPC submission, or wait for a selected commitment when `confirm: true` is passed. Client-sent transactions always use the official executor's `confirmed` send-and-confirm behavior.

## Batch Transactions

```ts
import { useSignTransactions } from "@vue-solana/vue/useSignTransactions";
import { useSignAndSendTransactions } from "@vue-solana/vue/useSignAndSendTransactions";

const { signedTransactions, execute: signMany } = useSignTransactions();
const { signatures, execute: signAndSendMany } = useSignAndSendTransactions();

// One wallet request for N transactions.
const signed = await signMany([transactionA, transactionB]);

// One wallet request for N signatures.
const sent = await signAndSendMany([transactionA, transactionB], { minContextSlot });
```

Both prefer the wallet's batch capability. `useSignTransactions` falls back to the legacy batch `signAllTransactions` feature; `useSignAndSendTransactions` falls back to sending the singular request in sequence. Batch signing is all-or-nothing (a rejection signs nothing), but the sign-and-send fallback can leave earlier transactions submitted. When that happens it rejects with a `PartialSignAndSendError` whose `signatures` lists the transactions already sent, so a retry can skip them:

```ts
import { PartialSignAndSendError } from "@vue-solana/vue/useSignAndSendTransactions";

try {
  await signAndSendMany([transactionA, transactionB]);
} catch (error) {
  if (error instanceof PartialSignAndSendError) {
    // error.signatures: the ones that already landed — resend only the rest.
  }
}
```

## Selected Wallet Account

For app-wide selected-account state with persistence and filtering, mount the provider once near the root and read it anywhere:

```vue
<script setup lang="ts">
import { SelectedWalletAccountProvider } from "@vue-solana/vue/useSelectedWalletAccount";
</script>

<template>
  <SelectedWalletAccountProvider :filter-wallet="filter">
    <RouterView />
  </SelectedWalletAccountProvider>
</template>
```

```ts
import { useSelectedWalletAccount } from "@vue-solana/vue/useSelectedWalletAccount";

const [selectedAccount, setSelectedAccount, filteredWallets] = useSelectedWalletAccount();
```

The selection persists as `${walletName}:${accountAddress}` in `localStorage` by default (pass `stateSync` to customize or `null` to disable) and is restored on the next visit when the wallet and account are available. `filterWallet` restricts which wallet accounts are offered. In Nuxt, the module's runtime plugin installs this context automatically.

## Client Capabilities and Planning

```ts
import { usePayer, useIdentity } from "@vue-solana/vue/usePayer";
import { usePlanTransaction } from "@vue-solana/vue/usePlanTransaction";

// Reactive signers from the Kit client (requires a signer plugin).
const payer = usePayer();
const identity = useIdentity();

// Plan transaction messages from instructions without sending.
const { transactionMessage, execute } = usePlanTransaction();
const message = await execute(instructions);
```

`useClientCapability("payer")` asserts a capability is installed on the client and throws a descriptive error (naming the hook and how to install it) during setup when it is missing. The default Vue client already installs the official planner and transaction-sending executor; custom clients must install `rpcTransactionPlanner()` and `rpcTransactionPlanSendingExecutor()` themselves.

## Confirm an Existing Signature

Use `useTransactionConfirmation()` when your app already has a submitted signature and wants to wait for a specific commitment separately from signing and sending:

```ts
import { useTransactionConfirmation } from "@vue-solana/vue/useTransactionConfirmation";

const { signature, confirmation, status, loading, error, confirm, reset } =
  useTransactionConfirmation({ commitment: "confirmed", timeoutMs: 60_000 });

await confirm("PASTE_SUBMITTED_SIGNATURE", { commitment: "finalized" });
```

The composable preserves the submitted `signature` when confirmation times out or the RPC call fails, so apps can still show an explorer link while surfacing `error` to the user.

## Track Signature Status

```ts
import { useSignatureStatus } from "@vue-solana/vue/useSignatureStatus";

const { status, loading, error, refresh, stopPolling, stopSubscription } = useSignatureStatus(
  "PASTE_SUBMITTED_SIGNATURE",
  {
    pollIntervalMs: 5_000,
    searchTransactionHistory: true,
    subscribe: true,
    commitment: "confirmed",
  },
);
```

Polling uses `getSignatureStatuses()` on every interval, so stop polling when the UI no longer needs updates. Calling `stopPolling()` clears the current interval and prevents automatic polling restarts for that composable instance. Invalid signatures clear stale `status`, set `error`, and do not call RPC or start polling. Invalid `pollIntervalMs` values less than or equal to `0` set a `RangeError` and do not start polling. `subscribe: true` uses `onSignature()` and removes the listener on component unmount. Calling `stopSubscription()` removes the current signature listener and prevents automatic restarts for that composable instance.

## Example App

For a complete runnable Vue and Vite flow, see the [Vue Vite example](/examples/vue-vite).
