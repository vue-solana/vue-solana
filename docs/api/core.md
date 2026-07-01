# `@vue-solana/core` API Reference

The root export remains supported. Direct subpath exports are also available when you want narrower imports:

- `@vue-solana/core/address`
- `@vue-solana/core/types`
- `@vue-solana/core/clusters`
- `@vue-solana/core/ios-wallet`
- `@vue-solana/core/mobile-wallet`
- `@vue-solana/core/rpc`
- `@vue-solana/core/transaction`
- `@vue-solana/core/wallet`
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

## `@solana/web3-compat` Compatibility

The v1 package line uses `@solana/web3-compat` for Solana primitives so applications can interoperate with the modern Solana package family while Vue Solana keeps familiar `Connection`, `PublicKey`, and transaction types at its public boundary. The current `@solana/web3-compat@0.0.21` package has broken TypeScript root metadata, so this repository includes a temporary `types/web3-compat.d.ts` shim. Runtime imports still resolve to the published package. Re-check the upstream package metadata before v1 and remove the shim once the package publishes valid root declarations.

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
  connection: Connection;
}
```

## Wallet

```ts
interface SolanaWallet {
  publicKey: PublicKey | null;
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
  ) => Promise<{ signature: TransactionSignature }>;
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
- `protocol-link` is reserved for planned desktop native wallet adapters.

For wallet behavior and platform support, see [Wallet Support](../wallets.md).

## Helpers

Transaction confirmation types:

```ts
interface ConfirmTransactionOptions {
  commitment?: Commitment;
  timeoutMs?: number;
}

interface TransactionConfirmation {
  signature: TransactionSignature;
  commitment: Commitment;
  result: RpcResponseAndContext<SignatureResult>;
}
```

- `DEFAULT_CLUSTER`: the default cluster, currently `devnet`.
- `getClusterEndpoint(cluster?)`: returns the HTTP RPC endpoint for a cluster.
- `getClusterWebSocketEndpoint(cluster?)`: returns the WebSocket endpoint for a cluster.
- `getWebSocketEndpoint(endpoint)`: converts `http`/`https` endpoints to `ws`/`wss` endpoints.
- `createSolanaConnection(config?)`: creates a Solana `Connection`.
- `createSolanaContext(config?)`: creates a `SolanaContext`.
- `isWalletConnected(wallet)`: returns whether a wallet is connected and has a public key.
- `assertWalletConnected(wallet)`: throws if the wallet is not connected.
- `assertWalletCanSign(wallet)`: throws if the wallet cannot sign transactions.
- `assertWalletCanSignMessage(wallet)`: throws if the wallet cannot sign messages.
- `signAndSendTransaction(connection, wallet, transaction, options?)`: signs and sends a transaction using wallet capabilities. Android Mobile Wallet Adapter wallets prefer `signTransaction` plus app-side RPC submission when available so the app can reliably return the submitted signature.
- `confirmTransactionSignature(connection, signature, options?)`: waits for a submitted signature to reach the requested commitment. Defaults to `confirmed` commitment and a 60 second timeout. It returns `TransactionConfirmation` and throws a clear timeout or failed-confirmation error.
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
