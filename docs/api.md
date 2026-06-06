# API Reference

This page summarizes the public APIs exported by the Vue Solana packages.

`@vue-solana/core` builds on top of `@solana/web3-compat`; it does not replace it. Use `@solana/web3-compat` for raw Solana primitives and use Vue Solana packages for Vue/Nuxt-friendly setup, config, wallet state, and composables.

For Solana terminology, see [Solana Concepts For Vue Developers](./solana-concepts.md) and the official [Solana Documentation](https://solana.com/docs).

## `@vue-solana/core`

### Configuration

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

Supported clusters:

- `mainnet-beta`: Solana mainnet. This is the official Solana cluster name.
- `devnet`: developer network with free test SOL from the [Solana Faucet](https://faucet.solana.com).
- `testnet`: validator and protocol testing network. Testnet SOL is also available from the [Solana Faucet](https://faucet.solana.com).
- `localnet`: local validator, usually `http://127.0.0.1:8899`.

Use `mainnet-beta` rather than `mainnet`.

### Context

```ts
interface SolanaContext {
  cluster: SolanaCluster;
  endpoint: string;
  wsEndpoint: string;
  connection: Connection;
}
```

### Wallet

```ts
interface SolanaWallet {
  publicKey: PublicKey | null;
  connected: boolean;
  connecting?: boolean;
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

Browser wallets discovered through the Solana Wallet Standard are adapted into this interface. Apps can also provide a custom object that implements `SolanaWallet`.

### Wallet Discovery

```ts
interface SolanaWalletInfo {
  name: string;
  icon: string;
  chains: readonly string[];
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

### Helpers

- `DEFAULT_CLUSTER`: the default cluster, currently `devnet`.
- `getClusterEndpoint(cluster?)`: returns the HTTP RPC endpoint for a cluster.
- `getClusterWebSocketEndpoint(cluster?)`: returns the WebSocket endpoint for a cluster.
- `getWebSocketEndpoint(endpoint)`: converts `http`/`https` endpoints to `ws`/`wss` endpoints.
- `createSolanaConnection(config?)`: creates a Solana `Connection`.
- `createSolanaContext(config?)`: creates a `SolanaContext`.
- `isWalletConnected(wallet)`: returns whether a wallet is connected and has a public key.
- `assertWalletConnected(wallet)`: throws if the wallet is not connected.
- `assertWalletCanSign(wallet)`: throws if the wallet cannot sign transactions.
- `signAndSendTransaction(connection, wallet, transaction, options?)`: signs and sends a transaction using wallet capabilities.
- `getSolanaChain(cluster)`: maps a package cluster to a Wallet Standard chain ID.
- `isSolanaStandardWallet(wallet)`: checks whether a Wallet Standard wallet supports Solana.
- `getRegisteredSolanaWallets()`: returns discovered Solana browser wallets in browser environments.
- `subscribeSolanaWallets(listener)`: subscribes to Wallet Standard register/unregister events.
- `adaptSolanaStandardWallet(walletInfo, options?)`: adapts a discovered wallet into `SolanaWallet`.

## `@vue-solana/vue`

### `createSolanaPlugin(options?)`

Installs the Solana context into a Vue app.

```ts
createApp(App).use(
  createSolanaPlugin({
    cluster: "devnet",
    commitment: "confirmed",
  }),
);
```

`VueSolana` is an alias for `createSolanaPlugin`.

### `useSolana()`

Returns the full injected Vue Solana context. Throws `Vue Solana plugin is not installed` if the plugin was not registered.

### `useRpc()`

Returns RPC state and connection helpers:

- `cluster`
- `endpoint`
- `wsEndpoint`
- `status`
- `error`
- `latestBlockhash`
- `checkConnection()`
- `connection`

### `useConnection()`

Returns the Solana `Connection` directly.

### `useWallet()`

Returns wallet state and actions:

- `wallet`
- `publicKey`
- `connected`
- `connecting`
- `setWallet(wallet)`
- `connect()`
- `disconnect()`

### `useWallets()`

Returns discovered browser wallets and selection actions:

- `wallets`
- `selectedWallet`
- `refreshWallets()`
- `selectWallet(wallet)`

### `useBalance(address, commitment?)`

Loads the lamport balance for a `PublicKey` or address string.

Returns:

- `balance`
- `loading`
- `error`
- `refresh()`

### `useTransaction(handler)`

Wraps an async transaction handler with state.

Returns:

- `signature`
- `loading`
- `error`
- `execute(...args)`

### `useSignAndSendTransaction()`

Uses the current connection and configured wallet to sign and send a transaction.

Returns the same state shape as `useTransaction()`.

## `@vue-solana/nuxt`

### Module Config

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
    endpoint: "https://api.devnet.solana.com",
    wsEndpoint: "wss://api.devnet.solana.com",
    commitment: "confirmed",
  },
});
```

### Auto-Imports

- `useSolana()`
- `useSolanaRpc()`
- `useSolanaConnection()`
- `useSolanaWallet()`
- `useSolanaWallets()`
- `useSolanaBalance()`
- `useSolanaSignAndSendTransaction()`
