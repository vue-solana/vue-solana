---
title: "@vue-solana/core"
description: Framework-agnostic Solana configuration, RPC, wallet types, and transaction helpers.
---

`@vue-solana/core` contains framework-agnostic Solana primitives used by the Vue Solana packages.

Use this package directly when you want connection helpers, shared wallet types, Android Mobile Wallet Adapter registration helpers, iOS browser wallet helpers, and transaction helpers without installing the Vue plugin.

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

## Related Guides

- [RPC and Clusters](/guides/rpc-and-clusters): configure cluster names, custom RPC endpoints, WebSocket endpoints, and connection helpers.
- [Wallets](/guides/wallets): discover Wallet Standard wallets, register mobile wallet sources, and check wallet capabilities.
- [Transactions](/guides/transactions): sign, send, confirm, and handle transaction timeouts safely.
- [Errors](/guides/errors): branch on stable `SolanaError` codes and keep raw causes out of user-facing UI.

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

Browser wallets discovered through the Solana Wallet Standard and supported iOS browser wallet links are adapted into this interface. You can also provide a custom object that implements `SolanaWallet`. A discovered wallet remains disconnected until `connect()` resolves successfully, even if the browser extension exposes previously authorized accounts.

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
- `protocol-link` is reserved for possible post-v1 desktop native wallet adapters.

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

The root `@vue-solana/core` export re-exports the public helpers below. Use direct subpaths when you want narrower imports or clearer module boundaries.

| Import path                        | What it contains                                                              | Use it when                                                                                                         |
| ---------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `@vue-solana/core/address`         | `parsePublicKey()` and public-key input types.                                | You accept a Solana address as a string, `PublicKey`, ref-like object, or getter and need a normalized `PublicKey`. |
| `@vue-solana/core/clusters`        | Default cluster and endpoint helpers.                                         | You need the package's built-in RPC or WebSocket endpoint for `mainnet-beta`, `testnet`, `devnet`, or `localnet`.   |
| `@vue-solana/core/errors`          | `SolanaError`, error factories, and error guards.                             | You need stable error codes for user-facing wallet, RPC, address, transaction, timeout, or storage failures.        |
| `@vue-solana/core/ios-wallet`      | iOS browser wallet discovery, deep-link adapters, and callback handling.      | You are wiring iOS wallet links without the Vue plugin's unified wallet flow.                                       |
| `@vue-solana/core/mobile-wallet`   | Android Mobile Wallet Adapter registration helpers.                           | You need to register Android MWA before reading Wallet Standard wallets.                                            |
| `@vue-solana/core/rpc`             | `createSolanaConnection()` and `createSolanaContext()`.                       | You want a configured `Connection` and resolved cluster endpoints without installing the Vue plugin.                |
| `@vue-solana/core/timeout`         | Promise timeout helpers that produce Solana timeout errors.                   | You need timeout behavior consistent with transaction confirmation helpers.                                         |
| `@vue-solana/core/transaction`     | Transaction send and confirmation helpers.                                    | You need a wallet-aware send path or a confirmation result for an existing signature.                               |
| `@vue-solana/core/types`           | Shared TypeScript types.                                                      | You need `SolanaConfig`, `SolanaContext`, `SolanaWallet`, wallet metadata, or transaction option types.             |
| `@vue-solana/core/wallet`          | Wallet state assertions and wallet capability errors.                         | You need to validate that a selected wallet is connected or supports signing before calling wallet methods.         |
| `@vue-solana/core/wallet-standard` | Wallet Standard chain mapping, discovery, subscriptions, and adapter helpers. | You are building your own wallet discovery layer on top of Solana Wallet Standard.                                  |

### Clusters and RPC

- `DEFAULT_CLUSTER`: default cluster, currently `devnet`.
- `getClusterEndpoint(cluster?)`: returns the HTTP RPC endpoint for a cluster.
- `getClusterWebSocketEndpoint(cluster?)`: returns the WebSocket endpoint for a cluster.
- `getWebSocketEndpoint(endpoint)`: converts `http`/`https` RPC URLs to `ws`/`wss` URLs.
- `createSolanaConnection(config?)`: creates a `Connection` using the resolved endpoint and commitment.
- `createSolanaContext(config?)`: creates `{ cluster, endpoint, wsEndpoint, connection }` for framework-agnostic app setup.

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({ cluster: "devnet" });

const slot = await solana.connection.getSlot();
```

### Addresses

- `parsePublicKey(value)`: parses a `PublicKey`, address string, ref-like value, or getter and returns `null` for nullish input.

```ts
import { parsePublicKey } from "@vue-solana/core/address";

const publicKey = parsePublicKey("11111111111111111111111111111111");
const balance = publicKey ? await connection.getBalance(publicKey) : null;
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

- `signAndSendTransaction(connection, wallet, transaction, options?)`: signs and sends a transaction using a configured wallet and returns the RPC signature. Android Mobile Wallet Adapter wallets use `signTransaction` plus `connection.sendRawTransaction()` when available so the app owns submission and can reliably return the RPC signature after the wallet handoff.
- `confirmTransactionSignature(connection, signature, options?)`: waits for a submitted signature to reach a requested commitment. Defaults to `confirmed` commitment and a 60 second timeout.

```ts
import { confirmTransactionSignature, signAndSendTransaction } from "@vue-solana/core/transaction";

const signature = await signAndSendTransaction(connection, wallet, transaction);
await confirmTransactionSignature(connection, signature, { commitment: "confirmed" });
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
  await signAndSendTransaction(connection, wallet, transaction);
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

## Known TypeScript Issue

See [Troubleshooting](/troubleshooting) for the `@solana/web3-compat@0.0.21` TypeScript metadata issue and consumer shim workaround.
