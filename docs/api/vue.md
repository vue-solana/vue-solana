# `@vue-solana/vue` API Reference

The root export remains supported for existing apps. For composables, prefer direct subpath imports in new code so bundlers do not need to evaluate the full Vue package barrel:

```ts
import { useRpc } from "@vue-solana/vue/useRpc";
import { useWallet } from "@vue-solana/vue/useWallet";
```

Available composable subpaths:

- `@vue-solana/vue/useSolana`
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

## `useRpc()`

Returns RPC state and connection helpers:

- `cluster`
- `endpoint`
- `wsEndpoint`
- `status`
- `error`
- `latestBlockhash`
- `checkConnection()`
- `connection`

## `useConnection()`

Returns the Solana `Connection` directly.

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

For wallet behavior and platform support, see [Wallet Support](../wallets.md).

## `useBalance(address, commitment?)`

Loads the lamport balance for a `PublicKey` or address string.

`useBalance()` accepts an existing `PublicKey` or parses an address string with `PublicKey` from `@solana/web3-compat`.

Returns:

- `balance`
- `loading`
- `error`
- `refresh()`

## `useAccountInfo(address, options?)`

Loads account data for a `PublicKey` or address string, with optional websocket subscription updates.

Options:

- `commitment`: RPC commitment for the initial read and subscription.
- `watch`: when `true`, subscribes with `connection.onAccountChange()` and removes the listener on component unmount.

Returns:

- `accountInfo`
- `loading`
- `error`
- `refresh()`
- `stopWatching()`: removes the current account listener and prevents automatic restarts for this composable instance.

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

Reads the current status for a submitted signature. Pass `pollIntervalMs` to poll, or `subscribe: true` to receive an `onSignature()` websocket update. Both polling intervals and signature listeners are cleaned up on component unmount. Websocket notifications do not include a full `getSignatureStatuses()` response, so subscription updates set `confirmationStatus` from the requested `commitment`, defaulting to `confirmed`.

Options:

- `commitment`: commitment used for websocket signature subscriptions.
- `pollIntervalMs`: interval in milliseconds for repeated `getSignatureStatuses()` calls.
- `searchTransactionHistory`: forwards to `getSignatureStatuses()` for older signatures.
- `subscribe`: enables `connection.onSignature()` listener setup.

Returns:

- `status`
- `loading`
- `error`
- `refresh()`
- `stopPolling()`
- `stopSubscription()`: removes the current signature listener and prevents automatic subscription restarts for this composable instance.

Null input clears state without calling RPC. Invalid signatures are rejected before RPC: the signature must be base58-encoded and decode to exactly 64 bytes. Invalid `pollIntervalMs` values less than or equal to `0` set a `RangeError` and do not start polling.

RPC cost note: `useAccountInfo()` performs one `getAccountInfo()` call per refresh, and subscriptions consume websocket resources until cleaned up. `useSignatureStatus()` polling calls `getSignatureStatuses()` on every interval, so prefer modest intervals and stop polling once the signature reaches the status your UI needs. `useProgramAccounts()` is the highest-risk read in this group because broad program scans can consume significant RPC credits, hit rate limits, or time out. Use filters, data slicing, caching, pagination/indexing strategies, or dedicated RPC infrastructure for production-scale reads.
