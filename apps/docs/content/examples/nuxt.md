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
- Discovering browser extension wallets, Android Mobile Wallet Adapter wallets, and supported iOS browser wallet entries with `useSolanaWallets()`.
- Managing active wallet state with `useSolanaWallet()`.
- Persisting wallet selection metadata and restoring the previously selected wallet identity on reload.
- Optional `autoConnect` behavior that reconnects only the previously selected wallet when it is discovered again.
- Rendering unsupported-capability states for wallets that cannot sign messages or transactions.
- Signing an authentication message with auto-imported `useSolanaSignMessage()` when the connected wallet supports it.
- Sending a real transfer with `useSolanaSignAndSendTransaction()` and showing submitted vs confirmed transaction status. The example uses devnet by default for safe testing.
- Building cluster-aware Solana Explorer links for submitted signatures.
- Using `useTransaction()` from `@vue-solana/vue/useTransaction` for generic async transaction state.

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
- On Android Chrome, install a compatible Solana mobile wallet and look for `Mobile Wallet Adapter`.
- On iOS browsers, install Phantom, Solflare, or Backpack and look for the wallet entry in the same list.
- Select and connect a discovered wallet.
- Reload the page and verify the same selected wallet identity is restored without selecting an arbitrary installed wallet.
- Sign the sample auth message if the wallet reports message-signing support.
- Confirm the message-signing button is disabled or explained when the selected wallet does not support `signMessage`.
- Run the generic mock transaction.
- Enter a recipient address and amount, then send a real transfer. Keep the example on devnet while testing.
- Watch the transaction move from submitted signature to confirmation status.
- Open the explorer link and verify it includes `?cluster=devnet`.

The transfer example initializes the `buffer` browser polyfill with `import { Buffer } from "buffer/"`. Restart the Nuxt dev server if Vite previously cached an externalized `buffer` import.

If confirmation times out after a signature appears, do not immediately submit a duplicate transfer. Use the example's signature status or explorer link to check whether the transaction later confirmed.

## Devnet SOL

Request free devnet SOL from the official faucet:

```txt
https://faucet.solana.com
```

## Wallet Note

The example uses unified wallet discovery. Install Phantom, Solflare, Backpack, or another standard wallet before testing browser extension wallet flows. On supported Android Chrome runtimes, `@solana-mobile/wallet-standard-mobile` can expose installed native mobile wallets through `Mobile Wallet Adapter` in the same wallet list. On iOS browsers, Phantom, Solflare, and Backpack can appear through wallet-specific universal links.

Desktop native wallet protocol-link support is intentionally not part of the v1 example flow.
