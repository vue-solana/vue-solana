# Nuxt Example

Runnable Nuxt example app for `@vue-solana/nuxt`.

This example demonstrates:

- Installing the Nuxt module with `modules: ['@vue-solana/nuxt']`.
- Configuring the module with `solana: { cluster: 'devnet' }`.
- Reading RPC status with auto-imported `useSolanaRpc()`.
- Using the deprecated `useSolanaConnection()` alias, which returns the Kit client.
- Reading lamport balances with `useSolanaBalance()`.
- Discovering browser extension wallets and Android Mobile Wallet Adapter wallets with `useSolanaWallets()`.
- Managing active wallet state with `useSolanaWallet()`.
- Sending a real transfer with `useSolanaSignAndSendTransaction()`. The example uses devnet by default for safe testing.
- Using `useTransaction()` from `@vue-solana/vue/useTransaction` for generic async transaction state.
- Sending client-signed transactions with an ephemeral `payer` from `app/plugins/demo-payer.client.ts`, using `useSolanaPayer()`, `useSolanaPlanTransaction()`, and `useSolanaSendTransaction()` / `useSolanaSendTransactions()`. The example sets `solana.clientPlugin: false` so the module skips its own plugin; installing both would create two Solana contexts.
- Streaming live data with the `Live Data Panels` section, exercising auto-imported `useSolanaRequest()` stale-while-revalidate reads, `useSolanaSubscription()` RPC subscriptions, slot-deduplicated `useSolanaTrackedData()`, `useSolanaSignIn()` Sign In With Solana, and the SWR cache adapters from `@vue-solana/vue/swr`.

The app uses `devnet` by default. Devnet SOL has no real value.

The real transfer example initializes the browser `Buffer` polyfill with `installSolanaBufferPolyfill()` from `@vue-solana/nuxt/buffer-polyfill`. Restart the Nuxt dev server if Vite previously cached an externalized Buffer import.

## Run From The Repository Root

```sh
pnpm install
pnpm build:packages
pnpm dev:nuxt
```

Open the Nuxt URL printed in the terminal, usually `http://localhost:3000`.

## Run Directly

```sh
pnpm install
pnpm --filter @vue-solana/example-nuxt dev
```

## What To Try

- Check the initial module/RPC status and latest blockhash.
- Click `Load Blockhash` to call `client.rpc.getLatestBlockhash().send()` directly.
- Paste a devnet wallet address and refresh the balance.
- Install a Solana browser wallet such as Phantom, Solflare, or Backpack.
- On Android Chrome, install a compatible Solana mobile wallet and look for `Mobile Wallet Adapter`.
- Switch the wallet to devnet.
- Select and connect a discovered wallet.
- Run the generic mock transaction.
- Enter a recipient address and amount, then send a real transfer. Keep the example on devnet while testing.
- In the Live Data Panels, airdrop devnet SOL to the demo payer with the `useSolanaPayer` panel, then send an SPL Memo signed by the client with `useSolanaSendTransaction()` (no wallet popup) or a batch of two with `useSolanaSendTransactions()`, and watch the status go from `sending` to `sent`.
- Change the tracked address in the Live Data Panels section and watch the request, subscription, and tracked data panels re-fire.
- Connect a wallet that supports Sign In With Solana and click `Sign In` in the Live Data Panels.
- Toggle the SWR card off and on to see the stale-while-revalidate handoff from cached to fresh data.

## Devnet SOL

Request free devnet SOL from the official faucet:

```txt
https://faucet.solana.com
```

You can also use the Solana CLI:

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url devnet
```

## Wallet Note

The example uses Solana Wallet Standard discovery. Wallet flows require a browser extension wallet or, on supported Android Chrome runtimes, a compatible native mobile wallet exposed through `Mobile Wallet Adapter`. Use enough devnet SOL for transaction fees.

See [Wallets](../../apps/docs/content/guides/wallets.md) for the current wallet support status and [Nuxt example docs](../../apps/docs/content/examples/nuxt.md) for the docs-site page.
