---
title: "@vue-solana/core"
description: Framework-agnostic Solana configuration, RPC, wallet types, and transaction helpers.
ogSection: Packages
surroundOrder: 14
---

[`@vue-solana/core`](https://www.npmjs.com/package/@vue-solana/core) contains framework-agnostic Solana primitives used by the Vue Solana packages.

Use this package directly when you want Kit clients, endpoint helpers, shared wallet types, Android Mobile Wallet Adapter registration helpers, iOS browser wallet helpers, token account reads, and transaction helpers without installing the Vue plugin.

`@vue-solana/core` builds on the modern [`@solana/kit`](https://www.npmjs.com/package/@solana/kit). `createSolanaClient()` and the `@vue-solana/core/kit` subpath re-export Kit primitives. The legacy `@solana/web3-compat` API and the `web3` subpath were removed in v2.0.0 — see [Kit Migration](/guides/kit-migration) for the full before/after map.

## Install

```sh
pnpm add @vue-solana/core
```

## Quick Start

```ts
import { address } from "@vue-solana/core/kit";
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({ cluster: "devnet" });

const { value: latestBlockhash } = await solana.client.rpc.getLatestBlockhash().send();

console.log(solana.endpoint, latestBlockhash.blockhash);
```

You can also create a Kit client directly:

```ts
import { createSolanaClient } from "@vue-solana/core/kit";

const client = createSolanaClient({ cluster: "devnet" });

const slot = await client.rpc.getSlot().send();

console.log(slot); // bigint
```

`createSolanaContext()` returns `{ cluster, endpoint, wsEndpoint, client }`; the `client` carries `client.rpc` and `client.rpcSubscriptions`.

The root export remains supported. Direct subpath exports are also available for narrower imports:

```ts
import { createSolanaClient } from "@vue-solana/core/kit";
import { createSolanaContext } from "@vue-solana/core/rpc";
import { parseAddress } from "@vue-solana/core/address";
import { getTokenBalance } from "@vue-solana/core/token-accounts";
import type { SolanaConfig } from "@vue-solana/core/types";
```

Direct subpaths:

- `@vue-solana/core/address`
- `@vue-solana/core/action`
- `@vue-solana/core/buffer-polyfill`
- `@vue-solana/core/types`
- `@vue-solana/core/clusters`
- `@vue-solana/core/errors`
- `@vue-solana/core/ios-wallet`
- `@vue-solana/core/kit`
- `@vue-solana/core/mobile-wallet`
- `@vue-solana/core/rpc`
- `@vue-solana/core/timeout`
- `@vue-solana/core/transaction`
- `@vue-solana/core/wallet`
- `@vue-solana/core/wallet-standard`
- `@vue-solana/core/token-accounts`

## Related Guides

- [RPC and Clusters](/guides/rpc-and-clusters): configure cluster names, custom RPC endpoints, WebSocket endpoints, and client helpers.
- [Wallets](/guides/wallets): discover Wallet Standard wallets, register mobile wallet sources, and check wallet capabilities.
- [Transactions](/guides/transactions): sign, send, confirm, and handle transaction timeouts safely.
- [Errors](/guides/errors): branch on stable `SolanaError` codes and keep raw causes out of user-facing UI.

## Configuration

```ts
type SolanaCluster = "mainnet" | "mainnet-beta" | "testnet" | "devnet" | "localnet";

interface SolanaConfig {
  cluster?: SolanaCluster;
  endpoint?: string;
  wsEndpoint?: string;
  commitment?: Commitment;
  autoConnect?: boolean;
  payer?: TransactionSigner;
  payerSecretKey?: string;
}
```

Supported clusters are `mainnet` (legacy alias `mainnet-beta`), `testnet`, `devnet`, and `localnet`. Wallet helpers use Wallet Standard chain identifiers such as `solana:devnet`, which are derived from clusters by `getSolanaChain()`. If `endpoint` is omitted, the package uses the public Solana RPC endpoint for the selected cluster. If `wsEndpoint` is omitted, it is derived from the RPC endpoint.

`autoConnect` defaults to `false`. When enabled through the Vue plugin or Nuxt module, Vue Solana reconnects only a wallet identity that the user previously selected and that is discovered again on the client. It stores only wallet identity metadata under `localStorage["vue-solana:selected-wallet"]`: `name`, and `platform`/`source` when available. It never stores private keys, session data, or transaction data, and it never connects an arbitrary installed wallet.

`payer` is a Kit `TransactionSigner` used as the client's fee payer and signer for client-sent transactions. `payerSecretKey` is a base64-encoded 64-byte Ed25519 keypair with the secret key first; it is resolved to a signer when the client is created. Both options are supported by direct core and Vue clients.

`createSolanaClient()` composes the official `@solana/kit-plugin-rpc` stack by default: `solanaRpc()`, `rpcTransactionPlanner()`, and `rpcTransactionPlanSendingExecutor()`. The old custom fallback sender is not used. The client exposes RPC reads and subscriptions plus `planTransaction(s)` and `sendTransaction(s)`. Its official sending executor adds a fresh blockhash, resource-limit and preflight handling, signs with the available client signers, submits the transaction, and waits for `confirmed` commitment before the send resolves. A client send requires a `payer` signer.

Never put a raw secret or `payerSecretKey` in Nuxt public runtime config. Do not ship a funded signing key to an end-user browser; use a server or relayer boundary, or an ephemeral unfunded signer for demos.

Use `mainnet` for Solana mainnet. This is Solana's official mainnet cluster name. The legacy `mainnet-beta` spelling is still accepted and redirects to the same `https://api.mainnet.solana.com` endpoint.

## Context

```ts
interface SolanaContext {
  cluster: SolanaCluster;
  endpoint: string;
  wsEndpoint: string;
  client: SolanaClient;
}
```

`client` is a [`@solana/kit`](https://www.npmjs.com/package/@solana/kit) client built by `createSolanaClient()` and exposes `client.rpc`, `client.rpcSubscriptions`, `planTransaction(s)`, and `sendTransaction(s)`.

## Wallet Interface

```ts
interface SolanaWallet {
  publicKey: Address | null;
  connected: boolean;
  connecting?: boolean;
  disconnecting?: boolean;
  platform?: SolanaWalletInfo["platform"];
  source?: SolanaWalletInfo["source"];
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage?: (message: Uint8Array) => Promise<SolanaSignMessageResult>;
  signTransaction?: (transaction: SolanaTransaction) => Promise<SolanaTransaction>;
  signAllTransactions?: (transactions: SolanaTransaction[]) => Promise<SolanaTransaction[]>;
  signAndSendTransaction?: (
    transaction: SolanaTransaction,
    options?: SendTransactionOptions,
  ) => Promise<{ signature: Signature }>;
}
```

Browser wallets discovered through the Solana Wallet Standard and supported iOS browser wallet links are adapted into this interface. You can also provide a custom object that implements `SolanaWallet`. A discovered wallet remains disconnected until `connect()` resolves successfully, even if the browser extension exposes previously authorized accounts.

`publicKey` is the base58-encoded Kit `Address` (a string) of the connected account. `SolanaTransaction` is `Uint8Array` — raw wire transaction bytes that the wallet signs as-is; the leading byte distinguishes legacy from versioned transactions.

Android Mobile Wallet Adapter is registered through `@solana-mobile/wallet-standard-mobile` and then adapted through the same Wallet Standard adapter.

## Wallet Metadata

```ts
interface SolanaWalletInfo {
  name: string;
  icon: string;
  chains: readonly string[];
  platform?: "browser" | "mobile" | "desktop";
  source?: "wallet-standard" | "mobile-wallet-adapter" | "deep-link" | "protocol-link";
  appUrl?: string;
  installUrl?: string;
  callbackUrl?: string;
  capabilities?: {
    connect?: boolean;
    disconnect?: boolean;
    signMessage?: boolean;
    signTransaction?: boolean;
    signAllTransactions?: boolean;
    signAndSendTransaction?: boolean;
  };
  accounts: readonly SolanaWalletAccountInfo[];
  wallet: unknown;
}
```

Current metadata values:

- Browser extension wallets use `platform: "browser"` and `source: "wallet-standard"`.
- Android Mobile Wallet Adapter uses `platform: "mobile"` and `source: "mobile-wallet-adapter"`.
- iOS browser wallets use `platform: "mobile"` and `source: "deep-link"`.
- `protocol-link` is reserved for possible future desktop native wallet adapters.

## Wallet Standard Helpers

```ts
type SolanaChain = "solana:mainnet" | "solana:testnet" | "solana:devnet" | "solana:localnet";
```

`SolanaChain` is the Wallet Standard chain identifier used by wallet discovery, mobile wallet registration, iOS wallet links, and wallet adapter signing options. Use `getSolanaChain(cluster)` when you need to derive one from a configured Solana cluster.

- `getSolanaChain(cluster)`: maps `mainnet-beta` or `mainnet`, `devnet`, `testnet`, or `localnet` to a Solana Wallet Standard chain ID.
- `isSolanaStandardWallet(wallet)`: checks whether a Wallet Standard wallet supports Solana.
- `getRegisteredSolanaWallets()`: returns discovered Solana Wallet Standard wallets in browser environments, including Android Mobile Wallet Adapter after it is registered on supported clients.
- `subscribeSolanaWallets(listener)`: subscribes to Wallet Standard register/unregister events.
- `adaptSolanaStandardWallet(walletInfo, options?)`: adapts a discovered Wallet Standard wallet into `SolanaWallet`.

## Mobile Wallet Helpers

- `registerSolanaMobileWallet(options?)`: registers Android Mobile Wallet Adapter through Wallet Standard on supported Android Chrome clients.
- `isSolanaMobileWalletSupported()`: returns whether the current runtime supports Android MWA web registration.
- `getDefaultMobileWalletAppIdentity()`: derives a default Mobile Wallet Adapter app identity from the current document.
- `getSolanaIosWallets(options?)`: returns Phantom, Solflare, and Backpack iOS browser wallet entries on iOS browsers.
- `adaptSolanaIosWallet(walletInfo, options?)`: adapts an iOS deep-link wallet entry into `SolanaWallet`.
- `handleSolanaIosWalletCallback(options?)`: validates and decrypts iOS wallet redirect callbacks.
- `isSolanaIosBrowserWalletSupported()`: returns whether the current runtime should expose iOS browser wallet links.

These helpers are SSR-safe. Android registration returns without registering when `window` is unavailable or when the browser is not an Android Chrome mobile web/PWA runtime. iOS wallet discovery returns an empty list when the browser is not an iOS browser runtime.

## Helpers

The root `@vue-solana/core` export re-exports the public helpers below. Use direct subpaths when you want narrower imports or clearer module boundaries.

| Import path                        | What it contains                                                                                                            | Use it when                                                                                                                  |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `@vue-solana/core/action`          | `createSolanaActionStore()`, `SolanaActionState`, and `isSolanaActionAborted()`.                                            | You need a framework-agnostic async action state machine with abort-on-redispatch for Solana work.                           |
| `@vue-solana/core/address`         | `parseAddress()` and address input types.                                                                                   | You accept a Solana address as a string, ref-like object, or getter and need a validated, normalized `Address`.              |
| `@vue-solana/core/clusters`        | Default cluster and endpoint helpers.                                                                                       | You need the package's built-in RPC or WebSocket endpoint for `mainnet`, `mainnet-beta`, `testnet`, `devnet`, or `localnet`. |
| `@vue-solana/core/errors`          | `SolanaError`, error factories, and error guards.                                                                           | You need stable error codes for user-facing wallet, RPC, address, transaction, timeout, or storage failures.                 |
| `@vue-solana/core/ios-wallet`      | iOS browser wallet discovery, deep-link adapters, and callback handling.                                                    | You are wiring iOS wallet links without the Vue plugin's unified wallet flow.                                                |
| `@vue-solana/core/kit`             | `createSolanaClient()` and the `@solana/kit` re-exports (`Address`, `address`, `lamports`, `SolanaRpcApi`, `SolanaClient`). | You want the modern Kit API without the full `@solana/kit` dependency graph.                                                 |
| `@vue-solana/core/mobile-wallet`   | Android Mobile Wallet Adapter registration helpers.                                                                         | You need to register Android MWA before reading Wallet Standard wallets.                                                     |
| `@vue-solana/core/rpc`             | `createSolanaContext()`.                                                                                                    | You want a configured Kit client and resolved cluster endpoints without installing the Vue plugin.                           |
| `@vue-solana/core/timeout`         | Promise timeout helpers that produce Solana timeout errors.                                                                 | You need timeout behavior consistent with transaction confirmation helpers.                                                  |
| `@vue-solana/core/transaction`     | Transaction send and confirmation helpers.                                                                                  | You need a wallet-aware send path or a confirmation result for an existing signature.                                        |
| `@vue-solana/core/token-accounts`  | Stateless SPL Token account reads (`getTokenAccountsByOwner`, `getTokenAccount`, `getTokenBalance`).                        | You need token account or balance reads through the Kit RPC `jsonParsed` API.                                                |
| `@vue-solana/core/types`           | Shared TypeScript types.                                                                                                    | You need `SolanaConfig`, `SolanaContext`, `SolanaWallet`, wallet metadata, or transaction option types.                      |
| `@vue-solana/core/wallet`          | Wallet state assertions and wallet capability errors.                                                                       | You need to validate that a selected wallet is connected or supports signing before calling wallet methods.                  |
| `@vue-solana/core/wallet-standard` | Wallet Standard chain mapping, discovery, subscriptions, and adapter helpers.                                               | You are building your own wallet discovery layer on top of Solana Wallet Standard.                                           |

### Clusters and RPC

- `DEFAULT_CLUSTER`: default cluster, currently `devnet`.
- `getClusterEndpoint(cluster?)`: returns the HTTP RPC endpoint for a cluster.
- `getClusterWebSocketEndpoint(cluster?)`: returns the WebSocket endpoint for a cluster.
- `getWebSocketEndpoint(endpoint)`: converts `http`/`https` RPC URLs to `ws`/`wss` URLs.
- `createSolanaClient(config?)`: creates a `@solana/kit` client whose `rpc` is wired to the resolved endpoint and WebSocket subscriptions, with the official planner and transaction-sending executor installed by default.
- `createSolanaContext(config?)`: creates `{ cluster, endpoint, wsEndpoint, client }` for framework-agnostic app setup.

```ts
import { createSolanaClient } from "@vue-solana/core/kit";

const client = createSolanaClient({ cluster: "devnet" });

const slot = await client.rpc.getSlot().send();
```

The `createSolanaContext` equivalent:

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({ cluster: "devnet" });

const slot = await solana.client.rpc.getSlot().send();
```

### Kit

The `@vue-solana/core/kit` subpath exports everything most apps need from `@solana/kit` without installing it directly:

```ts
import { address, lamports } from "@vue-solana/core/kit";
import type { Address, Commitment, Lamports, Signature, SolanaRpcApi } from "@vue-solana/core/kit";
```

- `createSolanaClient(config?)`: builds a Kit client for the given `SolanaConfig`. Reuses `clusters.ts` endpoint resolution, wires `rpcSubscriptionsUrl` from the resolved WebSocket endpoint, and installs the official RPC planner and transaction-sending executor by default.
- `client.rpc` exposes the full Solana read API (`getSlot`, `getBalance`, `getBlockHeight`, `getSignatureStatuses`, and more) as RPC functions called with `.send()`.
- `address(value)`: validates and returns an `Address` (base58 string brand) — the Kit replacement for `new PublicKey(...)`.
- `lamports(value: bigint)`: returns a `Lamports` value — the Kit replacement for raw lamport numbers.
- Types: `Address`, `Commitment`, `Lamports`, `Rpc`, `Signature`, `SolanaRpcApi`, `SolanaClient`.

RPC numeric results are `bigint`, and account data is `Uint8Array` rather than `Buffer`. See [Kit Migration](/guides/kit-migration) for details.

### Actions

`createSolanaActionStore()` wraps any async function that receives a fresh `AbortSignal` per call into a framework-agnostic action state machine. UI frameworks bridge the returned store into reactive state; the Vue composable `useAction()` is built on this store.

```ts
import { createSolanaActionStore, isSolanaActionAborted } from "@vue-solana/core/action";

const { dispatch, getState, subscribe, reset, withSignal } = createSolanaActionStore(
  (signal, address: Address) => client.rpc.getBalance(address).send(),
);

await dispatch(address);
```

- Each `dispatch` aborts the previous in-flight call with a fresh `AbortSignal`; superseded calls reject with an abort error and never corrupt state.
- `getState()` / `subscribe(listener)`: snapshot and stream of `SolanaActionState` (`status`, `data`, and `error`).
- `withSignal(signal, ...args)`: composes a caller-provided cancellation source for a single dispatch (per-attempt timeouts, shared kill switches).
- `isSolanaActionAborted(error)`: checks whether a rejection came from an aborted or superseded call.

### Addresses

- `parseAddress(value)`: parses an address string, ref-like value, or getter and returns `null` for nullish input. Throws `INVALID_ADDRESS` for an invalid base58 string. Accepts `Address` values unchanged.

```ts
import { parseAddress } from "@vue-solana/core/address";

const address = parseAddress("11111111111111111111111111111111");
const balance = address ? await client.rpc.getBalance(address).send() : null;
```

### Wallets

- `isWalletConnected(wallet)`: checks whether a wallet is connected and has a public key.
- `assertWalletConnected(wallet)`: throws `WALLET_NOT_CONNECTED` if the wallet is not connected.
- `assertWalletCanSign(wallet)`: throws if the wallet is disconnected or does not support `signTransaction`.
- `assertWalletCanSignMessage(wallet)`: throws if the wallet is disconnected or does not support `signMessage`.

```ts
import { assertWalletCanSign } from "@vue-solana/core/wallet";

assertWalletCanSign(wallet);
const signedTransaction = await wallet.signTransaction(transaction);
```

### Transactions

- `signAndSendTransaction(client, wallet, transaction, options?)`: signs and sends raw wire transaction bytes using a configured wallet and returns the RPC signature. Wallets that expose `signAndSendTransaction` are delegated to; otherwise the transaction is signed with `wallet.signTransaction` and submitted through `client.rpc.sendTransaction(...).send()`. Android Mobile Wallet Adapter wallets prefer signing plus app-side RPC submission so the app owns submission and reliably returns the RPC signature after the wallet handoff.
- `confirmTransactionSignature(client, signature, options?)`: waits for a submitted signature to reach a requested commitment. Defaults to `confirmed` commitment, a 60 second timeout, and polling `client.rpc.getSignatureStatuses([signature]).send()`.

The client-sent flow is separate from this wallet-aware helper. The client exposes `sendTransaction()` and `sendTransactions()` through the official `rpcTransactionPlanSendingExecutor()` installed by `createSolanaClient()`; the Vue composables wrap those methods. They plan, sign, submit, and wait for `confirmed` commitment; the `sent` status is set only after that send-and-confirm operation completes. A single result exposes the submitted signature at `data.context.signature`, while a batch result contains the full plan result tree. The official sender does not show a wallet popup.

```ts
import { confirmTransactionSignature, signAndSendTransaction } from "@vue-solana/core/transaction";

const signature = await signAndSendTransaction(client, wallet, transaction);
await confirmTransactionSignature(client, signature, { commitment: "confirmed" });
```

### SPL Token

Token reads use the Kit RPC `jsonParsed` API — no `@solana/spl-token` dependency.

- `getTokenAccountsByOwner(client, owner, options?)`: returns all SPL Token and Token-2022 accounts for an owner as `TokenAccountInfo[]` (`{ address, mint, owner, amount: bigint, decimals, state, isNative }`). Pass `programId` to limit to a single program.
- `getTokenAccount(client, address, commitment?)`: returns a single parsed token account (`TokenAccountInfo | null`). Returns `null` when the account does not exist or is not a token account.
- `getTokenBalance(client, mint, owner, commitment?)`: reads the owner's token account for the given mint and returns `{ amount, decimals }`. Returns `null` when no token account exists.

```ts
import { getTokenBalance } from "@vue-solana/core/token-accounts";

const balance = await getTokenBalance(client, mint, owner);
if (balance) {
  console.log(`${balance.amount} (${balance.decimals} decimals)`);
}
```

### Errors and Timeouts

- `SolanaError`: normalized error class with a stable `code` and optional original `cause`.
- `createSolanaError(code, message, options?)`: creates a normalized Solana error.
- `isSolanaError(error)`: narrows unknown errors to `SolanaError`.
- `normalizeSolanaError(cause, fallbackCode, fallbackMessage?, options?)`: converts unknown failures into `SolanaError` and maps common wallet rejections to `USER_REJECTED`.
- `withTimeout(promise, timeoutMs, createError)`: races a promise against a caller-provided timeout error.
- `withSolanaTimeout(promise, timeoutMs, message)`: races a promise against a `TRANSACTION_TIMEOUT` error.

## Error Model

Vue Solana normalizes common wallet, RPC, address, transaction, and storage failures into `SolanaError`. Apps should branch on the stable `error.code` value instead of parsing adapter or RPC messages.

```ts
import { isSolanaError } from "@vue-solana/core/errors";

try {
  await signAndSendTransaction(client, wallet, transaction);
} catch (error) {
  if (isSolanaError(error)) {
    switch (error.code) {
      case "USER_REJECTED":
        // The user declined a wallet prompt.
        break;
      case "TRANSACTION_TIMEOUT":
        // The operation timed out; check signature state before retrying.
        break;
      case "RPC_FAILURE":
        // RPC or confirmation failed.
        console.error(error.cause);
        break;
    }
  }
}
```

Stable error codes are:

- `NO_WALLET_SELECTED`
- `WALLET_NOT_CONNECTED`
- `WALLET_FEATURE_UNSUPPORTED`
- `USER_REJECTED`
- `INVALID_ADDRESS`
- `TRANSACTION_TIMEOUT`
- `RPC_FAILURE`
- `STORAGE_FAILURE`

`SolanaError.cause` preserves the original wallet adapter, RPC, parsing, or storage error for debugging. Do not show raw `cause` details to end users unless the app explicitly trusts that source.

## Buffer Polyfill

Browser code that serializes Solana transactions may need a Node-compatible `Buffer` global. Initialize it before transaction code with `installSolanaBufferPolyfill()` from `@vue-solana/core/buffer-polyfill`. The only remaining package-owned type shim covers the browser `buffer/` subpath this polyfill imports from.
