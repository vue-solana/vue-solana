# Wallet Support

The current packages expose wallet primitives, but they do not yet discover installed browser wallets such as Phantom, Solflare, or Backpack.

## What Works Today

- RPC connection setup.
- RPC health checks.
- Balance reads for any public key.
- Wallet state when you provide a wallet object.
- Transaction signing and sending when the configured wallet supports signing.

## What Is Not Included Yet

- Browser wallet discovery.
- Wallet selection UI.
- Solana Wallet Standard adapter mapping.
- Auto-connect to previously selected wallets.

## Manual Wallet Interface

Apps can provide a wallet object that implements `SolanaWallet`.

```ts
import type { SolanaWallet } from '@vue-solana/core'

const wallet: SolanaWallet = {
  publicKey: null,
  connected: false,
  connecting: false,
  connect: async () => {},
  disconnect: async () => {},
  signTransaction: async transaction => transaction
}
```

Pass it to the Vue plugin:

```ts
createApp(App).use(createSolanaPlugin({
  cluster: 'devnet',
  wallet
}))
```

Or set it later:

```ts
const { setWallet } = useWallet()

setWallet(wallet)
```

## Planned Direction

The recommended next step is to add Solana Wallet Standard discovery and map selected browser wallets into the existing `SolanaWallet` interface. That keeps the current composables stable while enabling real browser wallet connect, disconnect, sign, and send flows.
