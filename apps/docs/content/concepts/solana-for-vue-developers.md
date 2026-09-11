---
title: Solana For Vue Developers
description: Practical Solana concepts for Vue and Nuxt developers.
ogSection: Concepts
surroundOrder: 5
---

This page explains the Solana terms you will see when using the Vue Solana packages. It is practical rather than exhaustive.

Official references:

- [Solana Documentation](https://solana.com/docs)
- [Solana RPC Methods](https://solana.com/docs/rpc)
- [Solana Clusters](https://solana.com/docs/references/clusters)
- [Solana Transactions](https://solana.com/docs/core/transactions)

## Connections And RPC

Frontend apps read Solana data through an RPC endpoint. There are two ways to send RPC requests:

- The modern Kit path exposes a read-only `client.rpc` via `useSolanaClient()` (or `createSolanaClient()` from `@vue-solana/core/kit`).
- The legacy `Connection` class from `@vue-solana/vue/web3` and `@vue-solana/nuxt/web3` is still supported but deprecated.

Vue Solana packages create and provide the connection and client for Vue and Nuxt code so composables can share the same cluster, endpoint, commitment, and wallet state.

```ts
createSolanaPlugin({
  cluster: "devnet",
  commitment: "confirmed",
});
```

## Public Keys And Addresses

A public key is a Solana account address. You can safely show public keys in a frontend app.

In the Kit path, addresses are typed `Address` strings created with `address()` from `@vue-solana/vue/kit`:

```ts
import { address } from "@vue-solana/vue/kit";

const publicKey = address("PASTE_A_SOLANA_ADDRESS");
```

The legacy path uses the `PublicKey` class:

```ts
import { PublicKey } from "@vue-solana/vue/web3";

const publicKey = new PublicKey("PASTE_A_SOLANA_ADDRESS");
```

See the [Kit Migration](/guides/kit-migration) guide for the full map between the two.

Never expose private keys, seed phrases, or secret key arrays in frontend code.

## Lamports And SOL

SOL is the native token on Solana. Lamports are the smallest unit of SOL.

```txt
1 SOL = 1,000,000,000 lamports
```

RPC balance methods return lamports. Convert lamports to SOL only for display.

The Kit read API returns lamports as a `bigint`:

```ts
const lamports = await rpc.getBalance(address("YOUR_ADDRESS")).send();
const sol = Number(lamports) / 1_000_000_000;
```

The legacy `Connection` returns a number:

```ts
const lamports = await connection.getBalance(publicKey);
const sol = lamports / 1_000_000_000;
```

Note that Kit RPC calls return `bigint` for numeric fields and `Uint8Array` for account data.

## Wallets

A wallet stores keys and signs transactions. Browser extension wallets include Phantom, Solflare, and Backpack. Android native mobile wallets can connect through Solana Mobile Wallet Adapter on supported Android Chrome runtimes. Phantom, Solflare, and Backpack can also connect from iOS browsers through wallet-specific universal links.

Vue Solana discovers Solana Wallet Standard browser extension wallets, Android Mobile Wallet Adapter wallets, and supported iOS browser wallet links through the unified `useWallets()` flow. RPC reads and balance reads work without a wallet. Connecting, signing, and sending transactions require a discovered wallet or custom object that implements the `SolanaWallet` interface.

See [Wallets](/guides/wallets) for current support and the desktop native wallet post-v1 status.

## Transactions And Signing

A transaction is a set of instructions that changes Solana state. Examples include transferring SOL, creating an account, or interacting with a program.

Signing proves that the wallet owner approves the transaction. Frontend apps should ask the user's wallet to sign. They should not hold private keys.

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

## Safety Notes

- Use `devnet` while building and testing.
- Do not use a wallet with real funds for development.
- Do not hardcode private keys in frontend apps.
- Use `mainnet-beta` only when you are ready to interact with real SOL and production programs.
