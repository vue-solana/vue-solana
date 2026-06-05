---
title: Nuxt Example
description: Runnable Nuxt example app for @vue-solana/nuxt.
---

The Nuxt example is a runnable Nuxt app for `@vue-solana/nuxt`.

Source: [`examples/nuxt`](https://github.com/vue-solana/vue-solana/tree/main/examples/nuxt)

## What It Demonstrates

- Installing the Nuxt module with `modules: ['@vue-solana/nuxt']`.
- Configuring the module with `solana: { cluster: 'devnet' }`.
- Reading RPC status with auto-imported `useSolanaRpc()`.
- Using the injected connection with `useSolanaConnection()`.
- Reading lamport balances with `useSolanaBalance()`.
- Managing wallet state with `useSolanaWallet()`.
- Calling `useSolanaSignAndSendTransaction()` with a local mock wallet.
- Using `useTransaction()` from `@vue-solana/vue` for generic async transaction state.

The app uses `devnet` by default. Devnet SOL has no real value.

## Run From The Repository Root

```sh
pnpm install
pnpm build:packages
pnpm dev:nuxt
```

Open the Nuxt URL printed in the terminal, usually `http://localhost:3000`.

## What To Try

- Check the initial module/RPC status and latest blockhash.
- Click `Load Blockhash` to call `connection.getLatestBlockhash()` directly.
- Paste a devnet wallet address and refresh the balance.
- Install and connect the mock wallet.
- Run the generic mock transaction.
- Run the mock sign-and-send flow.

## Devnet SOL

Request free devnet SOL from the official faucet:

```txt
https://faucet.solana.com
```

## Wallet Note

The current packages do not discover installed browser wallets yet. This example uses a local mock wallet so wallet-related composables can be tested without Phantom, Solflare, or Backpack.
