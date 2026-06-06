# Vue Vite Example

Runnable Vue 3 + Vite example app for `@vue-solana/vue`.

This example demonstrates:

- Installing the Vue Solana plugin with `createSolanaPlugin()`.
- Reading RPC status with `useRpc()`.
- Using the injected `Connection` with `useConnection()`.
- Reading lamport balances with `useBalance()`.
- Discovering browser wallets with `useWallets()`.
- Managing active wallet state with `useWallet()`.
- Tracking async transaction state with `useTransaction()`.
- Sending a real devnet transfer with `useSignAndSendTransaction()`.

The app uses `devnet` by default. Devnet SOL has no real value.

The real transfer example uses the `buffer` browser polyfill because some `@solana/web3-compat` transaction paths expect a Node-compatible `Buffer` global. If Vite reports that `buffer` was externalized, make sure imports use `buffer/` and restart the dev server.

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
- Click `Load Blockhash` to call `connection.getLatestBlockhash()` directly.
- Paste a devnet wallet address and refresh the balance.
- Install a Solana browser wallet such as Phantom, Solflare, or Backpack.
- Switch the wallet to devnet.
- Select and connect a discovered wallet.
- Run the generic mock transaction.
- Enter a recipient address and amount, then send a real devnet transfer.

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

The example uses Solana Wallet Standard discovery. Wallet flows require a browser wallet extension and enough devnet SOL for transaction fees.

See [Wallets](../../apps/docs/content/concepts/wallets.md) for the current wallet support status and [Vue Vite example docs](../../apps/docs/content/examples/vue-vite.md) for the docs-site page.
