# Vue Vite Example

Runnable Vue 3 + Vite example app for `@vue-solana/vue`.

This example demonstrates:

- Installing the Vue Solana plugin with `createSolanaPlugin()`.
- Reading RPC status with `useRpc()`.
- Using the deprecated `useConnection()` alias, which returns the Kit client.
- Reading lamport balances with `useBalance()`.
- Discovering browser extension wallets and Android Mobile Wallet Adapter wallets with `useWallets()`.
- Managing active wallet state with `useWallet()`.
- Tracking async transaction state with `useTransaction()`.
- Sending a real transfer with `useSignAndSendTransaction()`. The example uses devnet by default for safe testing.
- Sending client-signed transactions with an ephemeral `payer` from `src/main.ts`, using `usePayer()`, `usePlanTransaction()`, and `useSendTransaction()` / `useSendTransactions()`.
- Streaming live data with the `Live Data Panels` section, exercising `useRequest()` stale-while-revalidate reads, `useSubscription()` RPC subscriptions, slot-deduplicated `useTrackedData()`, `useSignIn()` Sign In With Solana, and the SWR cache adapters from `@vue-solana/vue/swr`.

The app uses `devnet` by default. Devnet SOL has no real value.

The real transfer example initializes the browser `Buffer` polyfill with `installSolanaBufferPolyfill()` from `@vue-solana/vue/buffer-polyfill`. Restart the Vite dev server if Vite previously cached an externalized Buffer import.

## Run From The Repository Root

```sh
pnpm install
pnpm build:packages
pnpm dev:vue
```

Open the Vite URL printed in the terminal, usually `http://localhost:5173`.

## Run Directly

```sh
pnpm install
pnpm --filter @vue-solana/example-vue-vite dev
```

## What To Try

- Check the initial RPC status and latest blockhash.
- Click `Load Blockhash` to call `client.rpc.getLatestBlockhash().send()` directly.
- Paste a devnet wallet address and refresh the balance.
- Install a Solana browser wallet such as Phantom, Solflare, or Backpack.
- On Android Chrome, install a compatible Solana mobile wallet and look for `Mobile Wallet Adapter`.
- Switch the wallet to devnet.
- Select and connect a discovered wallet.
- Run the generic mock transaction.
- Enter a recipient address and amount, then send a real transfer. Keep the example on devnet while testing.
- In the Live Data Panels, airdrop devnet SOL to the demo payer with the `usePayer` panel, then send an SPL Memo signed by the client with `useSendTransaction()` (no wallet popup) or a batch of two with `useSendTransactions()`, and watch the status go from `sending` to `sent`.
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

See [Wallets](../../apps/docs/content/guides/wallets.md) for the current wallet support status and [Vue Vite example docs](../../apps/docs/content/examples/vue-vite.md) for the docs-site page.
