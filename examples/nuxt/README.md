# Nuxt Example

Runnable Nuxt example app for `@vue-solana/nuxt`.

This example demonstrates:

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

The real transfer example uses the `buffer` browser polyfill because some `@solana/web3-compat` transaction paths expect a Node-compatible `Buffer` global. If Vite reports that `buffer` was externalized, make sure imports use `buffer/` and restart the dev server.

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

See [Wallets](../../apps/docs/content/concepts/wallets.md) for the current wallet support status and [Nuxt example docs](../../apps/docs/content/examples/nuxt.md) for the docs-site page.
