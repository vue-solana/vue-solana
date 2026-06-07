# Wallet Support

Vue Solana supports browser wallet discovery through the Solana Wallet Standard. Wallets such as Phantom, Solflare, and Backpack can be discovered at runtime, selected by the app, and adapted into the existing `SolanaWallet` interface.

## What Works Today

- RPC connection setup and health checks.
- Balance reads for any public key.
- Browser wallet discovery with `useWallets()`.
- Wallet selection, connect, and disconnect.
- Transaction signing through the active wallet when the wallet exposes compatible signing features.
- Manual wallet injection with `setWallet()` for tests or custom adapters.

## Browser Wallet Flow

Use `useWallets()` to list discovered wallets and select one. Use `useWallet()` for the active wallet state and actions.

Discovery, selection, and connection are separate steps. `refreshWallets()` only updates the list of installed wallets, and `selectWallet()` only configures which wallet the app should use. `connected` stays `false` until `connect()` resolves successfully, even when a browser extension exposes previously authorized accounts after a page refresh.

```vue
<script setup lang="ts">
import { useWallet } from "@vue-solana/vue/useWallet";
import { useWallets } from "@vue-solana/vue/useWallets";

const { wallets, selectedWallet, selectWallet, refreshWallets } = useWallets();
const { publicKey, connected, connecting, connect, disconnect } = useWallet();
</script>

<template>
  <section>
    <button type="button" @click="refreshWallets">Refresh Wallets</button>

    <button
      v-for="wallet in wallets"
      :key="wallet.name"
      type="button"
      @click="selectWallet(wallet)"
    >
      {{ wallet.name }}
    </button>

    <p>Selected: {{ selectedWallet?.name ?? "None" }}</p>
    <p>Connected: {{ connected }}</p>
    <p>Public key: {{ publicKey?.toBase58() }}</p>

    <button type="button" :disabled="!selectedWallet || connected || connecting" @click="connect">
      {{ connecting ? "Connecting..." : "Connect" }}
    </button>
    <button type="button" :disabled="!connected" @click="disconnect">Disconnect</button>
  </section>
</template>
```

## Real Transfer Flow

After a wallet is selected and connected, create a normal Solana transaction and send it with `useSignAndSendTransaction()`. Browser apps that use `@solana/web3-compat` transaction code should install `buffer` and import from `buffer/` so Vite/Nuxt use the browser polyfill instead of the Node builtin.

```ts
import { Buffer } from "buffer/";
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3-compat";
import { useConnection } from "@vue-solana/vue/useConnection";
import { useSignAndSendTransaction } from "@vue-solana/vue/useSignAndSendTransaction";
import { useWallet } from "@vue-solana/vue/useWallet";

(globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer = Buffer;

const connection = useConnection();
const wallet = useWallet();
const sendTransaction = useSignAndSendTransaction();
const systemProgramId = new PublicKey("11111111111111111111111111111111");

async function sendLamports(recipient: string, lamports: number) {
  if (!wallet.publicKey.value) {
    throw new Error("Connect a wallet first");
  }

  const transaction = new Transaction();
  const latestBlockhash = await connection.getLatestBlockhash();
  const recipientPublicKey = new PublicKey(recipient);
  const data = new Uint8Array(12);
  const view = new DataView(data.buffer);

  view.setUint32(0, 2, true);
  view.setBigUint64(4, BigInt(lamports), true);

  transaction.feePayer = wallet.publicKey.value;
  transaction.recentBlockhash = latestBlockhash.blockhash;
  transaction.add(
    new TransactionInstruction({
      keys: [
        { pubkey: wallet.publicKey.value, isSigner: true, isWritable: true },
        { pubkey: recipientPublicKey, isSigner: false, isWritable: true },
      ],
      programId: systemProgramId,
      data,
    }),
  );

  await sendTransaction.execute(transaction, {
    skipPreflight: false,
  });
}
```

Use devnet while testing. Devnet SOL has no real value, but transactions still consume fees.

## Manual Wallet Interface

Apps can still provide a wallet object that implements `SolanaWallet`. This is useful for tests, mocks, or custom wallet integrations.

```ts
import type { SolanaWallet } from "@vue-solana/core/types";

const wallet: SolanaWallet = {
  publicKey: null,
  connected: false,
  connecting: false,
  connect: async () => {},
  disconnect: async () => {},
  signTransaction: async (transaction) => transaction,
};
```

Pass it to the Vue plugin:

```ts
createApp(App).use(
  createSolanaPlugin({
    cluster: "devnet",
    wallet,
  }),
);
```

Or set it later:

```ts
const { setWallet } = useWallet();

setWallet(wallet);
```

## Current Limits

- The library discovers standard wallets and exposes wallet metadata, but it does not render a wallet modal. Build your own selection UI with `useWallets()`.
- Auto-connect is reserved for future persisted wallet selection. The library does not auto-connect to an arbitrary installed wallet or treat extension-exposed accounts as connected before `connect()` succeeds.
- Signing support depends on each wallet exposing the relevant Solana Wallet Standard signing feature.
