---
title: "@vue-solana/core"
description: Framework-agnostic Solana configuration, RPC, wallet types, and transaction helpers.
---

`@vue-solana/core` contains framework-agnostic Solana primitives used by the Vue Solana packages.

Use this package directly when you want connection helpers, shared wallet types, Android Mobile Wallet Adapter registration helpers, and transaction helpers without installing the Vue plugin.

`@vue-solana/core` does not replace `@solana/web3-compat`. Use `@solana/web3-compat` for raw Solana primitives like `Connection`, `PublicKey`, and transactions. Use `@vue-solana/core` for Vue Solana shared configuration, cluster endpoint defaults, wallet interfaces, and transaction helpers.

## Install

```sh
pnpm add @vue-solana/core @solana/web3-compat
```

## Quick Start

```ts
import { createSolanaContext } from "@vue-solana/core";

const solana = createSolanaContext({
  cluster: "devnet",
});

const { blockhash } = await solana.connection.getLatestBlockhash();

console.log(solana.endpoint, blockhash);
```

The root export remains supported. Direct subpath exports are also available for narrower imports:

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";
import type { SolanaConfig } from "@vue-solana/core/types";
```

## Configuration

```ts
type SolanaCluster = "mainnet-beta" | "testnet" | "devnet" | "localnet";

interface SolanaConfig {
  cluster?: SolanaCluster;
  endpoint?: string;
  wsEndpoint?: string;
  commitment?: Commitment;
  autoConnect?: boolean;
}
```

Supported clusters are `mainnet-beta`, `testnet`, `devnet`, and `localnet`. If `endpoint` is omitted, the package uses the public Solana RPC endpoint for the selected cluster. If `wsEndpoint` is omitted, it is derived from the RPC endpoint.

`autoConnect` defaults to `false`. When enabled through the Vue plugin or Nuxt module, Vue Solana reconnects only a wallet identity that the user previously selected and that is discovered again on the client. It stores only wallet identity metadata under `localStorage["vue-solana:selected-wallet"]`: `name`, and `platform`/`source` when available. It never stores private keys, session data, or transaction data, and it never connects an arbitrary installed wallet.

Use `mainnet-beta` for Solana mainnet. This is Solana's official cluster name; the package intentionally does not use `mainnet` as an alias.

## Context

```ts
interface SolanaContext {
  cluster: SolanaCluster;
  endpoint: string;
  wsEndpoint: string;
  connection: Connection;
}
```

## Wallet Interface

```ts
interface SolanaWallet {
  publicKey: PublicKey | null;
  connected: boolean;
  connecting?: boolean;
  disconnecting?: boolean;
  platform?: SolanaWalletInfo["platform"];
  source?: SolanaWalletInfo["source"];
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signTransaction?: <T extends SolanaTransaction>(transaction: T) => Promise<T>;
  signAllTransactions?: <T extends SolanaTransaction>(transactions: T[]) => Promise<T[]>;
  signAndSendTransaction?: (
    transaction: SolanaTransaction,
    options?: SendOptions,
  ) => Promise<{ signature: TransactionSignature }>;
}
```

Browser wallets discovered through the Solana Wallet Standard are adapted into this interface. You can also provide a custom object that implements `SolanaWallet`. A discovered wallet remains disconnected until `connect()` resolves successfully, even if the browser extension exposes previously authorized accounts.

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
- `protocol-link` is reserved for planned desktop native wallet adapters.

## Wallet Standard Helpers

- `getSolanaChain(cluster)`: maps `mainnet-beta`, `devnet`, `testnet`, or `localnet` to a Solana Wallet Standard chain ID.
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

Direct subpaths:

- `@vue-solana/core/address`
- `@vue-solana/core/types`
- `@vue-solana/core/clusters`
- `@vue-solana/core/ios-wallet`
- `@vue-solana/core/mobile-wallet`
- `@vue-solana/core/rpc`
- `@vue-solana/core/transaction`
- `@vue-solana/core/wallet`
- `@vue-solana/core/wallet-standard`

- `DEFAULT_CLUSTER`: default cluster, currently `devnet`.
- `createSolanaConnection(config?)`: creates a `Connection`.
- `createSolanaContext(config?)`: creates `{ cluster, endpoint, wsEndpoint, connection }`.
- `getClusterEndpoint(cluster?)`: returns the HTTP RPC endpoint for a cluster.
- `getClusterWebSocketEndpoint(cluster?)`: returns the WebSocket endpoint for a cluster.
- `getWebSocketEndpoint(endpoint)`: converts `http`/`https` RPC URLs to `ws`/`wss` URLs.
- `parsePublicKey(value)`: parses a `PublicKey` or address string and returns `null` for nullish input.
- `isWalletConnected(wallet)`: checks whether a wallet is connected and has a public key.
- `assertWalletConnected(wallet)`: throws if the wallet is not connected.
- `assertWalletCanSign(wallet)`: throws if the wallet cannot sign transactions.
- `signAndSendTransaction(connection, wallet, transaction, options?)`: signs and sends a transaction using a configured wallet. Android Mobile Wallet Adapter wallets use `signTransaction` plus `connection.sendRawTransaction()` when available so the app owns submission and can reliably return the RPC signature after the wallet handoff.
- `confirmTransactionSignature(connection, signature, options?)`: waits for a submitted signature to reach a requested commitment. Defaults to `confirmed` commitment and a 60 second timeout.

## Known TypeScript Issue

See [Troubleshooting](/troubleshooting) for the `@solana/web3-compat@0.0.21` TypeScript metadata issue and consumer shim workaround.
