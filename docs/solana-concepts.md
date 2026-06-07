# Solana Concepts For Vue Developers

This page explains the Solana terms you will see when using the Vue Solana packages. It is intentionally practical rather than exhaustive.

Official references:

- [Solana Documentation](https://solana.com/docs)
- [Solana RPC Methods](https://solana.com/docs/rpc)
- [Solana Clusters](https://solana.com/docs/references/clusters)
- [Solana Wallet Adapter](https://github.com/anza-xyz/wallet-adapter)

## Clusters

A Solana cluster is a network of validators. Apps choose which cluster to connect to.

Supported clusters in Vue Solana:

- `mainnet-beta`: Solana mainnet. This is the official Solana cluster name. Use this for production apps and real SOL.
- `devnet`: developer network. Use this while building apps. SOL on devnet has no real value.
- `testnet`: validator and protocol testing network. It is less common for app development than devnet.
- `localnet`: a local validator running on your machine, usually at `http://127.0.0.1:8899`.

Use `mainnet-beta` rather than `mainnet`. Solana's canonical mainnet cluster name is `mainnet-beta`.

## RPC Endpoints

An RPC endpoint is the HTTP URL your app uses to read from or write to Solana.

Examples:

- `https://api.devnet.solana.com`
- `https://api.mainnet-beta.solana.com`
- `http://127.0.0.1:8899`

The `Connection` object from `@solana/web3-compat` sends RPC requests to this endpoint. Public endpoints are useful for getting started, but production apps usually use a dedicated RPC provider for reliability and rate limits.

Official reference: [Solana RPC](https://solana.com/docs/rpc)

## WebSocket Endpoints

WebSocket endpoints are used for subscriptions and real-time updates. Vue Solana derives a WebSocket endpoint from your RPC endpoint unless you pass `wsEndpoint` explicitly.

Examples:

- `wss://api.devnet.solana.com`
- `wss://api.mainnet-beta.solana.com`
- `ws://127.0.0.1:8900`

## Public Keys And Addresses

A public key is a Solana account address. You can safely show public keys in a frontend app.

Example public key usage:

```ts
import { PublicKey } from "@solana/web3-compat";

const publicKey = new PublicKey("PASTE_A_SOLANA_ADDRESS");
```

Never expose private keys, seed phrases, or secret key arrays in frontend code.

## Lamports And SOL

SOL is the native token on Solana. Lamports are the smallest unit of SOL.

```txt
1 SOL = 1,000,000,000 lamports
```

RPC balance methods return lamports. Convert lamports to SOL only for display.

```ts
const lamports = await connection.getBalance(publicKey);
const sol = lamports / 1_000_000_000;
```

## Wallets

A wallet stores keys and signs transactions. Browser extension wallets include Phantom, Solflare, and Backpack. Android native mobile wallets can connect through Solana Mobile Wallet Adapter on supported Android Chrome runtimes.

Vue Solana discovers Solana Wallet Standard browser extension wallets and Android Mobile Wallet Adapter wallets through the unified `useWallets()` flow. RPC reads and balance reads work without a wallet. Connecting, signing, and sending transactions require a discovered wallet or custom object that implements the `SolanaWallet` interface.

See [Wallet Support](./wallets.md) for current support and planned iOS browser and desktop native wallet adapters.

## Transactions And Signing

A transaction is a set of instructions that changes Solana state. Examples include transferring SOL, creating an account, or interacting with a program.

Signing proves that the wallet owner approves the transaction. Frontend apps should ask the user's wallet to sign. They should not hold private keys.

Official reference: [Solana Transactions](https://solana.com/docs/core/transactions)

## Commitment Levels

Commitment controls how finalized returned data should be.

- `processed`: fastest, least final.
- `confirmed`: good default for most app UI reads.
- `finalized`: slowest, most final.

Example:

```ts
createSolanaPlugin({
  cluster: "devnet",
  commitment: "confirmed",
});
```

Official reference: [Commitment Status](https://solana.com/docs/rpc#configuring-state-commitment)

## Getting Devnet Or Testnet SOL

Devnet and testnet SOL are free testing tokens with no real value.

Use the official faucet:

```txt
https://faucet.solana.com
```

Choose `Devnet` or `Testnet`, paste your wallet address, and request SOL.

If you have the Solana CLI installed, you can also request an airdrop:

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url devnet
```

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url testnet
```

Official references:

- [Solana Faucet](https://faucet.solana.com)
- [Solana CLI Installation](https://solana.com/docs/intro/installation)

## Safety Notes

- Use `devnet` while building and testing.
- Do not use a wallet with real funds for development.
- Do not hardcode private keys in frontend apps.
- Use `mainnet-beta` only when you are ready to interact with real SOL and production programs.
