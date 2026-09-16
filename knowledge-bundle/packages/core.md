---
type: Package Reference
title: "@vue-solana/core API Reference"
description: Framework-agnostic Solana primitives, config types, Kit RPC client, wallet types, token account reads, and transaction helpers.
tags:
  - core
  - API
  - configuration
  - wallet
  - transaction
resource: https://github.com/vue-solana/vue-solana
timestamp: 2025-07-17T00:00:00Z
---

# `@vue-solana/core` API Reference

The root export remains supported. Direct subpath exports are also available when you want narrower imports:

- `@vue-solana/core/address`
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
- `@vue-solana/core/token-accounts`
- `@vue-solana/core/wallet-standard`

## Configuration

```ts
type SolanaCluster = "mainnet-beta" | "testnet" | "devnet" | "localnet";
type SolanaChain = "solana:mainnet" | "solana:testnet" | "solana:devnet" | "solana:localnet";

interface SolanaConfig {
  cluster?: SolanaCluster;
  endpoint?: string;
  wsEndpoint?: string;
  commitment?: Commitment;
  autoConnect?: boolean;
}
```

If `endpoint` is omitted, the default public endpoint for the selected cluster is used. If `wsEndpoint` is omitted, it is derived from the selected cluster or custom endpoint.

`autoConnect` defaults to `false`. When enabled in the Vue plugin or Nuxt module, Vue Solana reconnects only a wallet identity that the user previously selected and that is discovered again on the client. It stores only wallet identity metadata under `localStorage["vue-solana:selected-wallet"]`: `name`, and `platform`/`source` when available. It never stores private keys, session data, or transaction data, and it never connects an arbitrary installed wallet. Calling `selectWallet(null)` or `setWallet(customWallet)` clears the stored selection.

## `@solana/kit` Client

The modern path re-exports Kit primitives and a client factory from `@vue-solana/core/kit`:

```ts
import { createSolanaClient, address, lamports } from "@vue-solana/core/kit";
import type { Address, SolanaClient } from "@vue-solana/core/kit";
```

`createSolanaClient(config?)` builds a `@solana/kit` client (with `rpc` and `rpcSubscriptions`) from `SolanaConfig`.

```ts
const client = createSolanaClient({ cluster: "devnet" });
const slot = await client.rpc.getSlot().send(); // bigint
```

`@vue-solana/core/kit` re-exports the Kit helpers and types Vue Solana consumers need: `address`, `lamports`, and the types `Address`, `Commitment`, `Lamports`, `Rpc`, `Signature`, `SolanaRpcApi`, and `SolanaClient`. Read calls return `bigint` numerics and base64-encoded account data — not `Buffer`. For the full before/after map, see [Kit Migration](../guides/kit-migration.md) (the docs-site guide lives at [`apps/docs/content/guides/kit-migration.md`](../../apps/docs/content/guides/kit-migration.md)).

## Legacy Compatibility Removed In v2

`@solana/web3-compat` was removed from every package in v2.0.0. There is no `connection` on the context, the `web3` subpaths (`@vue-solana/core/web3`, `@vue-solana/vue/web3`, `@vue-solana/nuxt/web3`) were deleted, `SolanaTransaction` is raw serialized `Uint8Array`, and `SolanaWallet.publicKey` is an `Address` string. The declaration shims that v1 published for the broken `web3-compat` metadata were removed.

Browser apps that create or serialize transactions can initialize the Buffer polyfill from core:

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/core/buffer-polyfill";

installSolanaBufferPolyfill();
```

Supported clusters:

- `mainnet-beta`: Solana mainnet. This is the official Solana cluster name.
- `devnet`: developer network with free test SOL from the [Solana Faucet](https://faucet.solana.com).
- `testnet`: validator and protocol testing network. Testnet SOL is also available from the [Solana Faucet](https://faucet.solana.com).
- `localnet`: local validator, usually `http://127.0.0.1:8899`.

Use `mainnet-beta` rather than `mainnet`.

## Context

```ts
interface SolanaContext {
  cluster: SolanaCluster;
  endpoint: string;
  wsEndpoint: string;
  client: SolanaClient;
}
```

`client` is the `@solana/kit` client from `createSolanaClient()` exposing `rpc` and `rpcSubscriptions`. `createSolanaContext()` builds it after resolving cluster, endpoint, and WebSocket endpoint.

## Wallet

```ts
interface SolanaWallet {
  publicKey: Address | null;
  connected: boolean;
  connecting?: boolean;
  disconnecting?: boolean;
  platform?: "browser" | "mobile" | "desktop";
  source?: "wallet-standard" | "mobile-wallet-adapter" | "deep-link" | "protocol-link";
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage?: (message: Uint8Array) => Promise<{
    signedMessage: Uint8Array;
    signature: Uint8Array;
  }>;
  signTransaction?: <T extends SolanaTransaction>(transaction: T) => Promise<T>;
  signAllTransactions?: <T extends SolanaTransaction>(transactions: T[]) => Promise<T[]>;
  signAndSendTransaction?: (
    transaction: SolanaTransaction,
    options?: SendOptions,
  ) => Promise<{ signature: Signature }>;
}
```

Browser wallets discovered through the Solana Wallet Standard are adapted into this interface. Android Mobile Wallet Adapter is registered through `@solana-mobile/wallet-standard-mobile` and then adapted through the same Wallet Standard adapter. Apps can also provide a custom object that implements `SolanaWallet`. A discovered wallet remains disconnected until `connect()` resolves successfully, even if the browser extension exposes previously authorized accounts.

## Wallet Discovery

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
  accounts: readonly {
    address: string;
    publicKey: Uint8Array;
    chains: readonly string[];
    label?: string;
    icon?: string;
  }[];
  wallet: unknown;
}
```

Current metadata values:

- Browser extension wallets use `platform: "browser"` and `source: "wallet-standard"`.
- Android Mobile Wallet Adapter uses `platform: "mobile"` and `source: "mobile-wallet-adapter"`.
- iOS browser wallets use `platform: "mobile"` and `source: "deep-link"`.
- `protocol-link` is reserved for possible desktop native wallet adapters.

For wallet behavior and platform support, see [Wallet Support](../guides/wallets.md).

## Helpers

Normalized errors:

```ts
type SolanaErrorCode =
  | "NO_WALLET_SELECTED"
  | "WALLET_NOT_CONNECTED"
  | "WALLET_FEATURE_UNSUPPORTED"
  | "USER_REJECTED"
  | "INVALID_ADDRESS"
  | "TRANSACTION_TIMEOUT"
  | "RPC_FAILURE"
  | "STORAGE_FAILURE";

class SolanaError extends Error {
  readonly code: SolanaErrorCode;
  readonly cause?: unknown;
  readonly feature?: string;
}
```

Vue Solana throws or stores `SolanaError` for common wallet, address, transaction, RPC, and storage failures. Apps should branch UI on `error.code` and use `error.cause` only for diagnostics or logging.

Transaction confirmation types:

```ts
interface ConfirmTransactionOptions {
  commitment?: Commitment;
  timeoutMs?: number;
}

type TransactionStatus = {
  slot: bigint;
  confirmations: bigint | null;
  err: unknown | null;
  confirmationStatus: Commitment | null;
};

interface TransactionConfirmation {
  signature: Signature;
  commitment: Commitment;
  status: TransactionStatus;
}
```

- `DEFAULT_CLUSTER`: the default cluster, currently `devnet`.
- `getClusterEndpoint(cluster?)`: returns the HTTP RPC endpoint for a cluster.
- `getClusterWebSocketEndpoint(cluster?)`: returns the WebSocket endpoint for a cluster.
- `getWebSocketEndpoint(endpoint)`: converts `http`/`https` endpoints to `ws`/`wss` endpoints.
- `createSolanaContext(config?)`: resolves cluster, endpoint, and WebSocket endpoint into a `SolanaContext` with the `@solana/kit` `client`.
- `createSolanaClient(config?)`: creates a `@solana/kit` client with `rpc` and `rpcSubscriptions` from `@vue-solana/core/kit`.
- `createSolanaError(code, message, options?)`: creates a normalized `SolanaError` with optional original `cause` and wallet `feature` metadata.
- `isSolanaError(error)`: checks whether an unknown thrown value is a `SolanaError`.
- `normalizeSolanaError(cause, fallbackCode, fallbackMessage?, options?)`: preserves existing `SolanaError` values, maps wallet rejection values to `USER_REJECTED`, and otherwise wraps the original cause in a fallback `SolanaError`.
- `isWalletConnected(wallet)`: returns whether a wallet is connected and has a public key.
- `assertWalletConnected(wallet)`: throws if the wallet is not connected.
- `assertWalletCanSign(wallet)`: throws if the wallet cannot sign transactions.
- `assertWalletCanSignMessage(wallet)`: throws if the wallet cannot sign messages.
- `parseAddress(value)`: validates and returns an `Address` from an `Address`, address string, ref-like object, getter, `null`, or `undefined`. Invalid address strings throw `INVALID_ADDRESS`.
- `signAndSendTransaction(client, wallet, transaction, options?)`: signs and sends a transaction using wallet capabilities (raw wire bytes). Android Mobile Wallet Adapter wallets prefer `signTransaction` plus app-side RPC submission when available so the app can reliably return the submitted signature. Serializes signed bytes and calls `client.rpc.sendTransaction(...)`.
- `confirmTransactionSignature(client, signature, options?)`: waits for a submitted signature to reach the requested commitment by polling `client.rpc.getSignatureStatuses([signature]).send()`. Defaults to `confirmed` commitment and a 60 second timeout. Returns `TransactionConfirmation` and throws a clear timeout or failed-confirmation error.
- `getSolanaChain(cluster)`: maps a package cluster to a Wallet Standard chain ID.
- `isSolanaStandardWallet(wallet)`: checks whether a Wallet Standard wallet supports Solana.
- `getRegisteredSolanaWallets()`: returns discovered Solana Wallet Standard wallets in browser environments, including Android Mobile Wallet Adapter after it is registered on supported clients.
- `subscribeSolanaWallets(listener)`: subscribes to Wallet Standard register/unregister events.
- `adaptSolanaStandardWallet(walletInfo, options?)`: adapts a discovered wallet into `SolanaWallet`.
- `registerSolanaMobileWallet(options?)`: registers Android Mobile Wallet Adapter through Wallet Standard on supported Android Chrome clients.
- `isSolanaMobileWalletSupported()`: returns whether the current runtime supports Android MWA web registration.
- `getDefaultMobileWalletAppIdentity()`: derives a default Mobile Wallet Adapter app identity from the current document.
- `getSolanaIosWallets(options?)`: returns Phantom, Solflare, and Backpack iOS browser wallet entries on iOS browsers.
- `adaptSolanaIosWallet(walletInfo, options?)`: adapts an iOS deep-link wallet entry into `SolanaWallet`.
- `handleSolanaIosWalletCallback(options?)`: validates and decrypts iOS wallet redirect callbacks.
- `isSolanaIosBrowserWalletSupported()`: returns whether the current runtime should expose iOS browser wallet links.

## SPL Token Reads (`@vue-solana/core/token-accounts`)

Token account reads go through Kit RPC `jsonParsed` responses. `@solana/spl-token` and its `unpack` helpers are no longer used; token accounts are returned as `TokenAccountInfo`:

```ts
interface TokenAccountInfo {
  address: Address;
  mint: Address;
  owner: Address;
  amount: bigint;
  decimals: number;
  state: string;
  isNative: boolean;
}
```

- `getTokenAccountsByOwner(client, owner, options?)`: fetches all token accounts for an owner address. Queries both `TOKEN_PROGRAM_ID` and `TOKEN_2022_PROGRAM_ID` by default, or a single `programId` via options. Returns `TokenAccountInfo[]`.
- `getTokenAccount(client, address, commitment?)`: fetches and parses a single token account by address. Returns `TokenAccountInfo | null`.
- `getTokenBalance(client, mint, owner, commitment?)`: reads the balance of an owner's associated token account for a mint. Returns `{ amount: bigint, decimals: number } | null`.
