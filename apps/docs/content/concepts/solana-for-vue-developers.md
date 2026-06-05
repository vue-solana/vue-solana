---
title: Solana For Vue Developers
description: Practical Solana concepts for Vue and Nuxt developers.
---

This page explains the Solana terms you will see when using the Vue Solana packages. It is practical rather than exhaustive.

Official references:

- [Solana Documentation](https://solana.com/docs)
- [Solana RPC Methods](https://solana.com/docs/rpc)
- [Solana Clusters](https://solana.com/docs/references/clusters)
- [Solana Transactions](https://solana.com/docs/core/transactions)

## Connections And RPC

Frontend apps read Solana data through an RPC endpoint. `@solana/web3-compat` exposes the `Connection` class that sends requests to that endpoint.

Vue Solana packages create and provide that connection for Vue and Nuxt code so composables can share the same cluster, endpoint, commitment, and wallet state.

```ts
createSolanaPlugin({
  cluster: 'devnet',
  commitment: 'confirmed'
})
```

## Public Keys And Addresses

A public key is a Solana account address. You can safely show public keys in a frontend app.

```ts
import { PublicKey } from '@solana/web3-compat'

const publicKey = new PublicKey('PASTE_A_SOLANA_ADDRESS')
```

Never expose private keys, seed phrases, or secret key arrays in frontend code.

## Lamports And SOL

SOL is the native token on Solana. Lamports are the smallest unit of SOL.

```txt
1 SOL = 1,000,000,000 lamports
```

RPC balance methods return lamports. Convert lamports to SOL only for display.

```ts
const lamports = await connection.getBalance(publicKey)
const sol = lamports / 1_000_000_000
```

## Wallets

A wallet stores keys and signs transactions. Browser wallets include Phantom, Solflare, and Backpack.

Vue Solana currently exposes wallet primitives, but it does not yet discover installed browser wallets. RPC reads and balance reads work without a wallet. Connecting, signing, and sending transactions require an object that implements the `SolanaWallet` interface.

See [Wallets](/concepts/wallets) for the current status and planned wallet adapter support.

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
  cluster: 'devnet',
  commitment: 'confirmed'
})
```

Official reference: [Commitment Status](https://solana.com/docs/rpc#configuring-state-commitment)

## Safety Notes

- Use `devnet` while building and testing.
- Do not use a wallet with real funds for development.
- Do not hardcode private keys in frontend apps.
- Use `mainnet-beta` only when you are ready to interact with real SOL and production programs.
