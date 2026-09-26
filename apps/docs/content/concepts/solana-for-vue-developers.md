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
- [Solana Core Concepts](https://solana.com/docs/core) — core Solana concepts such as accounts, programs, and transactions

## Connections And RPC

Frontend apps read Solana data through an RPC endpoint. The Kit path exposes a read-only `client.rpc` via `useSolanaClient()` (or `createSolanaClient()` from `@vue-solana/core/kit`).

Vue Solana packages create and provide the Kit client for Vue and Nuxt code so composables can share the same cluster, endpoint, commitment, and wallet state.

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

Addresses are base58 `Address` strings; the legacy `PublicKey` class and the `web3` subpaths were removed in v2.0.0.

See the [Kit Migration](/guides/kit-migration) guide for the full map between the two.

Never expose private keys, seed phrases, or secret key arrays in frontend code.

## Lamports And SOL

SOL is the native token on Solana. Lamports are the smallest unit of SOL.

```txt
1 SOL = 1,000,000,000 lamports
```

RPC balance methods return lamports. Convert lamports to SOL only for display.

Kit RPC methods return lamports as a `bigint`:

```ts
const { value: lamports } = await rpc.getBalance(address("YOUR_ADDRESS")).send();
const sol = Number(lamports) / 1_000_000_000;
```

Kit RPC calls return `bigint` for numeric fields and `Uint8Array` for account data.

## Wallets

A wallet stores keys and signs transactions. Browser extension wallets include Phantom, Solflare, and Backpack. Android native mobile wallets can connect through Solana Mobile Wallet Adapter on supported Android Chrome runtimes. Phantom, Solflare, and Backpack can also connect from iOS browsers through wallet-specific universal links.

Vue Solana discovers Solana Wallet Standard browser extension wallets, Android Mobile Wallet Adapter wallets, and supported iOS browser wallet links through the unified `useWallets()` flow. RPC reads and balance reads work without a wallet. Connecting, signing, and sending transactions require a discovered wallet or custom object that implements the `SolanaWallet` interface.

See [Wallets](/guides/wallets) for current support and the desktop native wallet status.

## Transactions And Signing

A transaction is a set of instructions that changes Solana state. Examples include transferring SOL, creating an account, or interacting with a program.

Signing proves that the wallet owner approves the transaction. Frontend apps should ask the user's wallet to sign. They should not hold private keys.

The default `createSolanaClient()` also composes Solana Kit's official RPC planner and transaction-sending executor, so trusted client contexts can plan and send without a wallet popup. That path requires a `payer` signer. Keep funded signers on a server or relayer; Nuxt's public runtime config must not contain a raw `payerSecretKey` or other secret.

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
- Use `mainnet` only when you are ready to interact with real SOL and production programs.
