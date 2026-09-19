---
type: Package Reference
title: "@vue-solana/vue API Reference"
description: Vue plugin, provide/inject context, and composables for Solana wallet and RPC integration.
tags:
  - vue
  - API
  - plugin
  - composables
  - wallet
resource: https://github.com/vue-solana/vue-solana
timestamp: 2025-07-17T00:00:00Z
---

# `@vue-solana/vue` API Reference

The root export remains supported for existing apps. For composables, prefer direct subpath imports in new code so bundlers do not need to evaluate the full Vue package barrel:

```ts
import { useRpc } from "@vue-solana/vue/useRpc";
import { useWallet } from "@vue-solana/vue/useWallet";
```

Available package subpaths:

- `@vue-solana/vue/buffer-polyfill`
- `@vue-solana/vue/useAction`
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
- `@vue-solana/vue/useTokenAccounts`
- `@vue-solana/vue/useTokenBalance`
- `@vue-solana/vue/kit`

Use `@vue-solana/vue/kit` for the Kit API (`createSolanaClient`, `address`, `lamports`, and the types `Address`, `Commitment`, `Rpc`, `Signature`, `SolanaRpcApi`, `SolanaClient`) and `@vue-solana/vue/useSolanaClient` for the Kit client composable. Use `@vue-solana/vue/buffer-polyfill` when browser transaction code needs the Buffer polyfill. Direct `@vue-solana/core/*` imports remain supported for lower-level core usage.

## `createSolanaPlugin(options?)`

Installs the Solana context into a Vue app.

```ts
createApp(App).use(
  createSolanaPlugin({
    cluster: "devnet",
    commitment: "confirmed",
    mobileWallet: {
      appIdentity: {
        name: "My Vue Solana App",
        uri: "https://example.com",
        icon: "favicon.ico",
      },
    },
    iosWallet: {
      redirectUrl: "https://example.com/wallet-callback",
    },
  }),
);
```

`VueSolana` is an alias for `createSolanaPlugin`.

`mobileWallet` controls Android Mobile Wallet Adapter registration. It defaults to enabled on supported Android Chrome clients, accepts `RegisterSolanaMobileWalletOptions`, and can be disabled with `mobileWallet: false`.

`iosWallet` controls iOS browser wallet universal-link entries. It defaults to enabled on iOS browser clients, accepts app identity and redirect URL options, and can be disabled with `iosWallet: false`.

## `useSolana()`

Returns the full injected Vue Solana context. If the plugin has not been installed, such as during Nuxt SSR before the client-only plugin runs, it returns inert SSR-safe state instead of throwing. Runtime RPC and wallet actions still require the plugin-provided client context.

## `useSolanaClient()`

Returns the `@solana/kit` client from the injected context as `{ client, rpc }`. It is the recommended RPC path and the replacement for `useRpc().connection` (now `client`) and the deprecated `useConnection()` alias:

```ts
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { client, rpc } = useSolanaClient();
const slot = await rpc.getSlot().send(); // bigint
```

`client.rpc` exposes the read-only `@solana/kit` RPC API. Read calls return `bigint` numerics and `Uint8Array` account data — not `Buffer`. In Nuxt SSR before the client-only plugin runs, it follows `useSolana()` and throws the "Vue Solana plugin is not installed" error instead of returning an inert client. For the full before/after map, see the [Kit Migration guide](../guides/kit-migration.md).

## `useRpc()`

Returns RPC state and the injected Kit client:

- `cluster`
- `endpoint`
- `wsEndpoint`
- `status`
- `error`
- `latestBlockhash`
- `checkConnection()`
- `client`

`error` is `SolanaError | null`. For example, connection checks normalize RPC failures to `RPC_FAILURE` while preserving the original thrown value on `error.cause`.

## `useConnection()`

Returns the injected Kit `client`. Deprecated in favor of `useSolanaClient()`; kept as a backward-compatible alias in v2.

## `useWallet()`

Returns wallet state and actions:

- `wallet`
- `publicKey`
- `connected`
- `connecting`
- `disconnecting`
- `loading`
- `capabilities`
- `canConnect`
- `canDisconnect`
- `canSignMessage`
- `canSignTransaction`
- `canSignAllTransactions`
- `canSignAndSendTransaction`
- `setWallet(wallet)`
- `connect()`
- `disconnect()`

## `useWallets()`

Returns discovered wallet metadata and selection actions. Browser extension wallets, Android Mobile Wallet Adapter wallets, and supported iOS browser wallets share this list:

- `wallets`
- `selectedWallet`
- `refreshWallets()`
- `selectWallet(wallet)`

`refreshWallets()` only updates discovered wallet metadata, and `selectWallet(wallet)` only chooses the active wallet. Call `connect()` from `useWallet()` to enter the connected state.

For wallet behavior and platform support, see [Wallet Support](../guides/wallets.md).

## `useBalance(address, commitment?)`

Loads the lamport balance (as a number) for an address string.

`useBalance()` parses the address string through `parseAddress()`. Invalid address strings set a normalized `INVALID_ADDRESS` error before any RPC call is made.

Returns:

- `balance`
- `loading`
- `error`
- `refresh()`

## `useTokenAccounts(owner, options?)`

Loads all SPL token accounts for a wallet owner address.

Options:

- `commitment`: RPC commitment for the read.
- `programId`: filter by a single token program (`TOKEN_PROGRAM_ID` or `TOKEN_2022_PROGRAM_ID`). By default queries both.

Returns:

- `tokenAccounts`
- `loading`
- `error`
- `refresh()`

Null input clears state without calling RPC. Invalid address strings set `error` before any RPC call.

## `useTokenBalance(mint, owner)`

Loads the SPL token balance for a specific mint and owner, deriving the associated token account (ATA) automatically.

Returns:

- `balance`: `bigint | null` (the raw token amount, or `null` if the ATA does not exist)
- `decimals`: `number | null`
- `loading`
- `error`
- `refresh()`

Null `mint` or `owner` clears state without calling RPC. Missing ATA returns `null` balance and decimals (not an error).

## Error Handling

Composable `error` refs use normalized `SolanaError` values for common failures, including wallet selection, unsupported features, user rejection, invalid addresses, transaction timeouts, RPC failures, and wallet-selection storage failures.

```ts
import { isSolanaError } from "@vue-solana/core/errors";

const sendTransaction = useSignAndSendTransaction();

try {
  await sendTransaction.execute(transaction, { confirm: true });
} catch (error) {
  if (isSolanaError(error)) {
    switch (error.code) {
      case "NO_WALLET_SELECTED":
        // Ask the user to choose a wallet.
        break;
      case "USER_REJECTED":
        // Keep the user on the same screen and let them retry.
        break;
      case "TRANSACTION_TIMEOUT":
        // Show the submitted signature if one is available.
        break;
      case "RPC_FAILURE":
        // Surface a retry action and log error.cause for diagnostics.
        break;
    }
  }
}
```

## `useAccountInfo(address, options?)`

Loads normalized account data (`executable`, `lamports`, `owner`, `space`, `data` as `Uint8Array`) for an address string.

Options:

- `commitment`: RPC commitment for the read.

Returns:

- `accountInfo`
- `loading`
- `error`
- `refresh()`

Null input clears state without calling RPC. Invalid address strings set `error` and do not call `getAccountInfo()`.

## `useProgramAccounts(programId, options?)`

Loads accounts owned by a program id, with optional `getProgramAccounts()` filters and data slicing.

> Warning: `useProgramAccounts()` can be expensive. Each refresh may scan a large program-owned account set, consume significant RPC credits, hit provider rate limits, or time out. Do not run broad scans from high-traffic UI paths. Use narrow `filters`, `dataSlice`, caching, indexing, pagination strategies, or dedicated RPC infrastructure for production reads.

Options:

- `commitment`: RPC commitment for the read.
- `filters`: `dataSize` or `memcmp` filters forwarded to `getProgramAccounts()`, including optional `memcmp.encoding`.
- `dataSlice`: byte range returned for each account's data.

Returns:

- `accounts`
- `loading`
- `error`
- `refresh()`

Null input clears state without calling RPC. Invalid program id strings set `error` and do not call `getProgramAccounts()`.

## `useTransaction(handler, options?)`

Wraps an async transaction handler with state.

Options:

- `timeoutMs`: rejects `execute()` if the handler does not resolve before this many milliseconds.
- `timeoutMessage`: custom error message for timeout failures. Defaults to `Transaction did not return a result before timing out.`

Returns:

- `signature`
- `loading`
- `error`
- `execute(...args)`

## `useSignAndSendTransaction()`

Uses the current connection and configured wallet to sign and send a transaction.

By default, `execute(transaction, options?)` returns after submission and sets `status` to `sent`. Pass `confirm: true` to wait for confirmation after the signature is submitted:

```ts
await sendTransaction.execute(transaction, {
  confirm: true,
  confirmation: { commitment: "confirmed", timeoutMs: 60_000 },
  skipPreflight: false,
});
```

Returns:

- `signature`
- `confirmation`
- `status`: `idle`, `sending`, `sent`, `confirming`, `processed`, `confirmed`, `finalized`, or `error`
- `loading`
- `error`
- `execute(transaction, options?)`

The submitted signature remains available if confirmation times out or RPC confirmation fails, so apps can still link users to an explorer.

## `useSignMessage()`

Uses the current connected wallet to sign arbitrary message bytes for wallet-auth flows. Message signing is not transaction signing: signed messages do not authorize token transfers, account changes, or on-chain execution.

```ts
const { canSignMessage, connected } = useWallet();
const signMessage = useSignMessage();

if (connected.value && canSignMessage.value) {
  const message = new TextEncoder().encode("Sign in to example.com: nonce-123");
  const { signature } = await signMessage.execute(message);
}
```

Returns:

- `signedMessage`
- `signature`
- `status`: `idle`, `signing`, `signed`, or `error`
- `loading`
- `error`
- `execute(message)`

Apps should render message-auth UI only when `useWallet().canSignMessage` is true. Unsupported wallets throw `Solana wallet does not support signMessage`.

## `useTransactionConfirmation(options?)`

Waits for a submitted signature to reach a requested commitment without coupling confirmation to the send step.

```ts
const confirmation = useTransactionConfirmation({ commitment: "confirmed" });

await confirmation.confirm(signature, { timeoutMs: 60_000 });
```

Returns:

- `signature`
- `confirmation`
- `status`: `idle`, `confirming`, `processed`, `confirmed`, `finalized`, or `error`
- `loading`
- `error`
- `confirm(signature, options?)`
- `reset()`

For explorer links, render after `signature` is set. For devnet, use a URL such as `https://explorer.solana.com/tx/${signature}?cluster=devnet`. Use `mainnet-beta`, `testnet`, or `localnet` to match the app cluster.

## `useSignatureStatus(signature, options?)`

Reads the current status for a submitted signature. Pass `pollIntervalMs` to poll. Polling intervals are cleaned up on component unmount.

Options:

- `commitment`: commitment used for signature status reads.
- `pollIntervalMs`: interval in milliseconds for repeated `getSignatureStatuses()` calls.
- `searchTransactionHistory`: forwards to `getSignatureStatuses()` for older signatures.

Returns:

- `status`
- `loading`
- `error`
- `refresh()`
- `stopPolling()`

Null input clears state without calling RPC. Invalid signatures are rejected before RPC: the signature must be base58-encoded and decode to exactly 64 bytes. Invalid `pollIntervalMs` values less than or equal to `0` set a `RangeError` and do not start polling.

## `useAction(action, options?)`

Generic async action state machine. Accepts any async function that receives a fresh `AbortSignal` per call and tracks state through Vue reactive refs.

```ts
const { data, dispatch, error, isRunning, reset, status } = useAction(
  async (signal, address) => {
    const { value } = await client.rpc.getBalance(address).send({ abortSignal: signal });
    return value;
  },
  {
    onSuccess: (data) => console.log("balance", data),
    onError: (cause) => console.error(cause),
  },
);
```

- `dispatch(...args)` always invokes the latest closure, so handlers reading reactive state never see stale values. `dispatch` keeps a stable identity across the component lifetime. Calling `dispatch` again while a call is in flight aborts the previous call; superseded calls reject with an abort reason and never corrupt state.
- `status`: `idle`, `running`, `success`, or `error`. Failures surface on `error` while the previous `data` is preserved for stale-while-revalidate rendering.
- `reset()` clears data and error and aborts any in-flight dispatch.
- Built on `createSolanaActionStore` from `@vue-solana/core/action`, shared with non-Vue consumers.

## `useClientCapability(capability, options?)`

Synchronous fail-fast assertion that a capability is installed on the (loosely-typed) Solana client. Accepts one capability name or an array. Throws `MissingClientCapabilityError` — with `hookName`, `capabilities`, and `providerHint` fields — if any requested capability is missing, so a misconfigured client fails during setup with a clear error instead of a cryptic `undefined is not a function` later.

```ts
import { useClientCapability } from "@vue-solana/vue/useClientCapability";

useClientCapability(["planTransaction"], {
  hookName: "usePlanTransaction",
  providerHint:
    "Install a planner plugin, e.g. `createClient().use(rpcTransactionPlanner())` from `@solana/kit-plugin-rpc`.",
});
```

The default `providerHint` points at adding the corresponding `@solana/kit` plugin with `createClient().use(...)`.

## `usePayer()` / `useIdentity()`

Return the client's signers as `Ref<TransactionSigner>`.

- `usePayer()`: the signer that pays transaction fees and storage costs. Requires the client `payer` capability (e.g. `createClient().use(generatedPayer())` from `@solana/kit-plugin-signer`).
- `useIdentity()`: the acting identity signer — the wallet whose assets the application acts upon. Requires the client `identity` capability (e.g. `createClient().use(generatedIdentity())`).

Both throw `MissingClientCapabilityError` with a signer-plugin hint when the capability is missing, and re-read the current signer on change when the client advertises `subscribeToPayer` / `subscribeToIdentity`.

## `usePlanTransaction()` / `usePlanTransactions()`

Plan a transaction message (or full transaction plan) from instruction inputs without signing or sending, using the client's transaction planning capability (`rpcTransactionPlanner` from `@solana/kit-plugin-rpc`).

```ts
const { transactionMessage, status, loading, error, execute } = usePlanTransaction();
await execute(instructionInput, { abortSignal });
```

- `usePlanTransaction()` returns `transactionMessage`, `status` (`idle`, `planning`, `planned`, `error`), `loading`, `error`, and `execute(input, config?)`.
- `usePlanTransactions()` returns `transactionPlan` with the same status/loading/error/execute shape and produces a plan of possibly multiple transaction messages.
- `config` accepts an optional `abortSignal`.
- Both throw a clear capability error when the client does not plan (e.g. `rpcTransactionPlanner` is not installed).

## `useSignTransactions()`

Signs multiple serialized transactions in a single wallet request, preferring the wallet's batch `signTransactions` capability and falling back to `signAllTransactions` (the legacy naming) when only that is present.

```ts
const { signedTransactions, status, loading, error, execute } = useSignTransactions();
const signed = await execute(transactions); // SolanaTransaction[]
```

- `status`: `idle`, `signing`, `signed`, or `error`.
- In the Wallet Standard a batch request is atomic: every transaction is signed or the request rejects. A failure clears the previous result.

## `useSignAndSendTransactions()`

Signs and sends multiple serialized transactions in a single wallet request, returning one signature per transaction. Prefers the wallet's batch `signAndSendTransactions` capability and falls back to sending singular `signAndSendTransaction` requests in sequence.

```ts
const { signatures, status, loading, error, execute } = useSignAndSendTransactions();
const sigs = await execute(transactions, options); // Signature[]
```

- `status`: `idle`, `sending`, `sent`, or `error`.
- When the sequential fallback fails partway through, `execute()` rejects with `PartialSignAndSendError` (a `SolanaError`), carrying `.signatures` for the transactions already sent so a retry can skip them. There is no batch rollback in the wallet.
- The whole batch is subject to a 120 second timeout.

## `useSelectedWalletAccount()`

App-wide selected wallet account state, mirroring `@solana/react`'s `SelectedWalletAccountContextProvider`. Call `provideSelectedWalletAccount(options?)` once near the root of your app, or mount the `SelectedWalletAccountProvider` component; then read state anywhere.

```ts
// Root of your app:
<SelectedWalletAccountProvider>
  <App />
</SelectedWalletAccountProvider>
```

```ts
const [selectedWalletAccount, setSelectedWalletAccount, filteredWallets] =
  useSelectedWalletAccount();
```

- Returns a tuple: the selected account ref (`SelectedWalletAccount | null`), a setter accepting the account or `null` to clear, and a computed list of filtered wallets.
- `SelectedWalletAccount` adds `walletName` to a discovered account. The setter persists the selection as `${walletName}:${accountAddress}` through `stateSync` (defaults to `localStorage`; pass `null` to disable) and syncs across tabs via the `storage` event.
- Options: `filterWallet(walletName, account)` — return `false` to hide an account (a wallet with no remaining accounts is hidden entirely).
- Throws `useSelectedWalletAccount must be used inside a SelectedWalletAccountProvider` when called outside a provider.
- In Nuxt, the runtime plugin installs this context app-wide automatically; mounting your own `SelectedWalletAccountProvider` shadows it with custom options.

## `useRequest(source, options?)`

One-shot SWR request over any async source: a request function `(signal) => Promise<T>`, a Kit request object (anything with `send()`), a `ref`/`computed` of either, or `null` to disable.

```ts
const { data, error, status, refresh } = useRequest(
  computed(() => (someAddress.value ? rpc.getBalance(someAddress.value) : null)),
  { getAbortSignal: () => AbortSignal.timeout(5_000) },
);
```

Statuses: `fetching`, `success`, `error`, `disabled`. While a revalidation runs, the previous `data` stays populated. `refresh()` re-fires manually. Changing a ref source re-fires; a `null` source clears state and reports `disabled`.

## `useSubscription(source, options?)`

Live data from Kit reactive stream sources (duck-typed on `reactiveStore()`), for example `rpcSubscriptions.slotNotifications()` or `rpcSubscriptions.accountNotifications(address)`. The connection tears down on unmount.

```ts
const { data, error, status, reconnect } = useSubscription(
  computed(() => (someAddress.value ? rpcSubscriptions.slotNotifications() : null)),
  { onError: (cause) => console.error(cause) },
);
```

Statuses: `loading`, `loaded`, `error`, `disabled`. `reconnect()` re-opens the stream while `data` keeps the last known value. Errors preserve stale `data`.

## `useTrackedData(source, options?)`

RPC data seeded by a one-shot fetch and updated by a subscription, slot-deduplicated so out-of-order arrivals cannot regress the value:

```ts
const { data, status, refresh } = useTrackedData({
  rpcRequest: rpc.getAccountInfo(someAddress, { encoding: "base64" }),
  rpcValueMapper: (value) => value.lamports,
  rpcSubscriptionRequest: rpcSubscriptions.accountNotifications(someAddress),
  rpcSubscriptionValueMapper: (value) => value.lamports,
});

// data.value keeps the SolanaRpcResponse envelope:
// data.value.value is the mapped item, data.value.context.slot the slot.
```

The mappers receive the unwrapped value; the returned `data` keeps the envelope. `refresh()` re-runs both sources with stale-while-revalidate. A `null` request or subscription disables the composable.

## SWR Cache Adapters (`@vue-solana/vue/swr`)

`useRequestSwr(key, source, options?)`, `useSubscriptionSwr(key, source, options?)`, and `useTrackedDataSwr(key, source, options?)` wrap the composables above with cache keying. Components mounted with the same key seed from the last-known value while their own request revalidates; results are written back for the next mount. Keys are namespaced per adapter, a `null` source disables and clears the key, and `clearSwrCache()` empties the cache (use per-request namespacing or clearing on the server). There is no `useAction` adapter: actions are mutations, not cacheable reads.

## `useSignIn()`

Triggers a wallet's Sign In With Solana (SIWS) feature when the selected wallet supports it.

```ts
const { signInResult, status, loading, error, signIn } = useSignIn();

const { account, signedMessage, signature } = await signIn({
  statement: "Sign in to My App",
  nonce: nonceFromBackend,
});
```

Statuses: `idle`, `signing-in`, `signed-in`, `error`. The result must be verified server-side (signature over `signedMessage` against `account.publicKey`, nonce check) before creating a session.

RPC cost note: `useAccountInfo()` performs one `getAccountInfo()` call per refresh, and subscriptions consume websocket resources until cleaned up. `useSignatureStatus()` polling calls `getSignatureStatuses()` on every interval, so prefer modest intervals and stop polling once the signature reaches the status your UI needs. `useProgramAccounts()` is the highest-risk read in this group because broad program scans can consume significant RPC credits, hit rate limits, or time out. Use filters, data slicing, caching, pagination/indexing strategies, or dedicated RPC infrastructure for production-scale reads.
