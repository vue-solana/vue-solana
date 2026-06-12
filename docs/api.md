# API Reference

This page summarizes the public APIs exported by the Vue Solana packages.

`@vue-solana/core` builds on top of `@solana/web3-compat`; it does not replace it. Use `@solana/web3-compat` for raw Solana primitives and use Vue Solana packages for Vue/Nuxt-friendly setup, config, wallet state, and composables.

For Solana terminology, see [Solana Concepts For Vue Developers](./solana-concepts.md) and the official [Solana Documentation](https://solana.com/docs).

## `@vue-solana/core`

The root export remains supported. Direct subpath exports are also available when you want narrower imports:

- `@vue-solana/core/types`
- `@vue-solana/core/clusters`
- `@vue-solana/core/mobile-wallet`
- `@vue-solana/core/rpc`
- `@vue-solana/core/transaction`
- `@vue-solana/core/wallet`
- `@vue-solana/core/wallet-standard`

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

`autoConnect` is reserved for future persisted wallet selection and is not currently used to connect discovered wallets automatically.

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

Browser wallets discovered through the Solana Wallet Standard are adapted into this interface. Android Mobile Wallet Adapter is registered through `@solana-mobile/wallet-standard-mobile` and then adapted through the same Wallet Standard adapter. Apps can also provide a custom object that implements `SolanaWallet`. A discovered wallet remains disconnected until `connect()` resolves successfully, even if the browser extension exposes previously authorized accounts.

### Wallet Discovery

```ts
interface SolanaWalletInfo {
  name: string;
  icon: string;
  chains: readonly string[];
  platform?: "browser" | "mobile" | "desktop";
  source?: "wallet-standard" | "mobile-wallet-adapter" | "deep-link" | "protocol-link";
  appUrl?: string;
  installUrl?: string;
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
- `deep-link` and `protocol-link` are reserved for planned iOS browser and desktop native wallet adapters.

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
- `signAndSendTransaction(connection, wallet, transaction, options?)`: signs and sends a transaction using wallet capabilities. Android Mobile Wallet Adapter wallets prefer `signTransaction` plus app-side RPC submission when available so the app can reliably return the submitted signature.
- `getSolanaChain(cluster)`: maps a package cluster to a Wallet Standard chain ID.
- `isSolanaStandardWallet(wallet)`: checks whether a Wallet Standard wallet supports Solana.
- `getRegisteredSolanaWallets()`: returns discovered Solana Wallet Standard wallets in browser environments, including Android Mobile Wallet Adapter after it is registered on supported clients.
- `subscribeSolanaWallets(listener)`: subscribes to Wallet Standard register/unregister events.
- `adaptSolanaStandardWallet(walletInfo, options?)`: adapts a discovered wallet into `SolanaWallet`.
- `registerSolanaMobileWallet(options?)`: registers Android Mobile Wallet Adapter through Wallet Standard on supported Android Chrome clients.
- `isSolanaMobileWalletSupported()`: returns whether the current runtime supports Android MWA web registration.
- `getDefaultMobileWalletAppIdentity()`: derives a default Mobile Wallet Adapter app identity from the current document.

## `@vue-solana/vue`

The root export remains supported for existing apps. For composables, prefer direct subpath imports in new code so bundlers do not need to evaluate the full Vue package barrel:

```ts
import { useRpc } from "@vue-solana/vue/useRpc";
import { useWallet } from "@vue-solana/vue/useWallet";
```

Available composable subpaths:

- `@vue-solana/vue/useSolana`
- `@vue-solana/vue/useRpc`
- `@vue-solana/vue/useConnection`
- `@vue-solana/vue/useBalance`
- `@vue-solana/vue/useWallet`
- `@vue-solana/vue/useWallets`
- `@vue-solana/vue/useTransaction`
- `@vue-solana/vue/useSignAndSendTransaction`

### `createSolanaPlugin(options?)`

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
  }),
);
```

`VueSolana` is an alias for `createSolanaPlugin`.

`mobileWallet` controls Android Mobile Wallet Adapter registration. It defaults to enabled on supported Android Chrome clients, accepts `RegisterSolanaMobileWalletOptions`, and can be disabled with `mobileWallet: false`.

### `useSolana()`

Returns the full injected Vue Solana context. If the plugin has not been installed, such as during Nuxt SSR before the client-only plugin runs, it returns inert SSR-safe state instead of throwing. Runtime RPC and wallet actions still require the plugin-provided client context.

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

Returns discovered wallet metadata and selection actions. Browser extension wallets and Android Mobile Wallet Adapter wallets share this list:

- `wallets`
- `selectedWallet`
- `refreshWallets()`
- `selectWallet(wallet)`

`refreshWallets()` only updates discovered wallet metadata, and `selectWallet(wallet)` only chooses the active wallet. Call `connect()` from `useWallet()` to enter the connected state.

### `useBalance(address, commitment?)`

Loads the lamport balance for a `PublicKey` or address string.

`useBalance()` lazy-loads `PublicKey` only when `refresh()` needs to parse an address string, so importing the composable does not statically import `@solana/web3-compat` runtime code.

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

The Nuxt module installs the runtime plugin on the client only and auto-imports composables from the direct `@vue-solana/vue/*` subpaths. This keeps SSR bundles from pulling in the full Vue package barrel solely because a page uses one composable.

- `useSolana()`
- `useSolanaRpc()`
- `useSolanaConnection()`
- `useSolanaWallet()`
- `useSolanaWallets()`
- `useSolanaBalance()`
- `useSolanaSignAndSendTransaction()`
