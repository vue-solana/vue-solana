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
- Discovering browser wallets with `useWallets()`.
- Managing active wallet state with `useWallet()`.
- Tracking async transaction state with `useTransaction()`.
- Sending a real devnet transfer with `useSignAndSendTransaction()`.

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
- Install a Solana browser wallet and switch it to devnet.
- Select and connect a discovered wallet.
- Run the generic mock transaction.
- Enter a recipient address and amount, then send a real devnet transfer.

The transfer example initializes the `buffer` browser polyfill with `import { Buffer } from "buffer/"`. Restart the Vite dev server if Vite previously cached an externalized `buffer` import.

## Devnet SOL

Request free devnet SOL from the official faucet:

```txt
https://faucet.solana.com
```

## Wallet Note

The example uses Solana Wallet Standard discovery. Install Phantom, Solflare, Backpack, or another standard wallet before testing wallet flows.
