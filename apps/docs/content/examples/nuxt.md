---
title: Nuxt Example
description: Runnable Nuxt example app for @vue-solana/nuxt.
---

The Nuxt example is a runnable Nuxt app for `@vue-solana/nuxt`.

Source: <a href="https://github.com/vue-solana/vue-solana/tree/main/examples/nuxt" target="_blank" rel="noopener noreferrer"><code>examples/nuxt</code></a>

Live demo: [vue-solana-docs.vercel.app/demo](https://vue-solana-docs.vercel.app/demo)

## What It Demonstrates

- Installing the Nuxt module with `modules: ['@vue-solana/nuxt']`.
- Configuring the module with `solana: { cluster: 'devnet' }`.
- Reading RPC status with auto-imported `useSolanaRpc()`.
- Using the injected connection with `useSolanaConnection()`.
- Reading lamport balances with `useSolanaBalance()`.
- Discovering browser wallets with `useSolanaWallets()`.
- Managing active wallet state with `useSolanaWallet()`.
- Sending a real devnet transfer with `useSolanaSignAndSendTransaction()`.
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
- Install a Solana browser wallet and switch it to devnet.
- Select and connect a discovered wallet.
- Run the generic mock transaction.
- Enter a recipient address and amount, then send a real devnet transfer.

The transfer example initializes the `buffer` browser polyfill with `import { Buffer } from "buffer/"`. Restart the Nuxt dev server if Vite previously cached an externalized `buffer` import.

## Devnet SOL

Request free devnet SOL from the official faucet:

```txt
https://faucet.solana.com
```

## Wallet Note

The example uses Solana Wallet Standard discovery. Install Phantom, Solflare, Backpack, or another standard wallet before testing wallet flows.
