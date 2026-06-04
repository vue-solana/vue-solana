---
title: Vue Vite Example
description: Runnable Vue 3 and Vite example app for @vue-solana/vue.
---

The Vue Vite example is a runnable Vue 3 app for `@vue-solana/vue`.

Source: [`examples/vue-vite`](https://github.com/vue-solana/vue-solana/tree/main/examples/vue-vite)

## What It Demonstrates

- Installing the Vue Solana plugin with `createSolanaPlugin()`.
- Reading RPC status with `useRpc()`.
- Using the injected `Connection` with `useConnection()`.
- Reading lamport balances with `useBalance()`.
- Managing wallet state with `useWallet()`.
- Tracking async transaction state with `useTransaction()`.
- Calling `useSignAndSendTransaction()` with a local mock wallet.

The app uses `devnet` by default. Devnet SOL has no real value.

## Run From The Repository Root

```sh
pnpm install
pnpm build:packages
pnpm dev:vue
```

Open the Vite URL printed in the terminal, usually `http://localhost:5173`.

## What To Try

- Check the initial RPC status and latest blockhash.
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
