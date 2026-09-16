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
- `@vue-solana/vue/useTokenAccounts`
- `@vue-solana/vue/useTokenBalance`
- `@vue-solana/vue/kit`
- `@vue-solana/vue/useSolanaClient`

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

RPC cost note: `useAccountInfo()` performs one `getAccountInfo()` call per refresh, and subscriptions consume websocket resources until cleaned up. `useSignatureStatus()` polling calls `getSignatureStatuses()` on every interval, so prefer modest intervals and stop polling once the signature reaches the status your UI needs. `useProgramAccounts()` is the highest-risk read in this group because broad program scans can consume significant RPC credits, hit rate limits, or time out. Use filters, data slicing, caching, pagination/indexing strategies, or dedicated RPC infrastructure for production-scale reads.
