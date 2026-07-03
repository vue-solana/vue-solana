---
title: "Transactions"
description: Sign, send, confirm, and handle transaction state with Vue Solana.
surroundOrder: 11
---

Vue Solana provides wallet-aware helpers for submitting transactions and composables for reactive transaction state.

This guide covers the Vue Solana boundary: wallet capability checks, signing, sending, confirmation, and errors. Build transaction instructions with `@solana/web3-compat` or your program client.

## Core Send Helper

Use `signAndSendTransaction()` from `@vue-solana/core/transaction` when you already have a `Connection`, wallet, and transaction.

```ts
import { signAndSendTransaction } from "@vue-solana/core/transaction";

const signature = await signAndSendTransaction(connection, wallet, transaction, {
  skipPreflight: false,
});
```

The helper returns the RPC signature string.

For Android Mobile Wallet Adapter wallets, Vue Solana prefers `signTransaction` plus `connection.sendRawTransaction()` when available so the app owns submission and can reliably return the RPC signature after the wallet handoff.

## Confirm a Signature

Use `confirmTransactionSignature()` when you need to wait until a submitted signature reaches a commitment level.

```ts
import { confirmTransactionSignature } from "@vue-solana/core/transaction";

const confirmation = await confirmTransactionSignature(connection, signature, {
  commitment: "confirmed",
  timeoutMs: 60_000,
});

console.log(confirmation.signature, confirmation.commitment);
```

Confirmation defaults to `confirmed` commitment and a 60 second timeout.

## Build A Real Devnet Transfer

This example creates a tiny system transfer on devnet. It uses `@solana/web3-compat` for raw Solana primitives and Vue Solana for wallet state and submission.

Browser apps that create or serialize transactions should initialize the `buffer` polyfill once before transaction code runs:

```ts
import { Buffer } from "buffer/";

(globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer = Buffer;
```

```ts
import { PublicKey, SystemProgram, Transaction } from "@solana/web3-compat";

async function createTransferTransaction(params: {
  connection: Connection;
  from: PublicKey;
  to: string;
  lamports: number;
}) {
  const recipient = new PublicKey(params.to);
  const { blockhash, lastValidBlockHeight } = await params.connection.getLatestBlockhash();

  const transaction = new Transaction({
    feePayer: params.from,
    blockhash,
    lastValidBlockHeight,
  });

  transaction.add(
    SystemProgram.transfer({
      fromPubkey: params.from,
      toPubkey: recipient,
      lamports: params.lamports,
    }),
  );

  return transaction;
}
```

Use devnet SOL while testing. Start with a tiny value such as `1_000` lamports (`0.000001` SOL). Never use a wallet with real funds while validating a tutorial or example flow.

## Vue Sign and Send Flow

Use `useSignAndSendTransaction()` when a Vue component needs reactive status, errors, and optional confirmation.

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useSignAndSendTransaction } from "@vue-solana/vue/useSignAndSendTransaction";
import { useConnection } from "@vue-solana/vue/useConnection";
import { useWallet } from "@vue-solana/vue/useWallet";

const recipient = ref("PASTE_DEVNET_RECIPIENT_ADDRESS");
const lamports = ref(1_000);
const connection = useConnection();
const { publicKey, connected, canSignTransaction } = useWallet();
const { signature, confirmation, status, error, execute } = useSignAndSendTransaction();

const canSubmit = computed(() => connected.value && canSignTransaction.value);

async function submitTransaction() {
  if (!publicKey.value) return;

  const transaction = await createTransferTransaction({
    connection,
    from: publicKey.value,
    to: recipient.value,
    lamports: lamports.value,
  });

  await execute(transaction, {
    confirm: true,
    confirmation: { commitment: "confirmed" },
  });
}
</script>

<template>
  <section>
    <button type="button" :disabled="!canSubmit" @click="submitTransaction">
      Send transaction
    </button>
    <p>Status: {{ status }}</p>
    <p v-if="signature">Signature: {{ signature }}</p>
    <p v-if="confirmation">Confirmed at {{ confirmation.commitment }}</p>
    <p v-if="error">Unable to send transaction.</p>
  </section>
</template>
```

`status` distinguishes submission from confirmation. A returned `signature` means the transaction was submitted to RPC. `confirmation` means the submitted signature reached the requested commitment. If confirmation times out after submission, keep showing the signature and check its status before retrying.

## Explorer Links

Explorer links should match the cluster your app is using.

```ts
function explorerUrl(signature: string, cluster: string) {
  const suffix = cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}
```

For devnet, links should look like `https://explorer.solana.com/tx/SIGNATURE?cluster=devnet`. Mainnet links intentionally omit the cluster query.

## Generic Transaction State

Use `useTransaction()` when your async transaction-like operation does not fit the built-in sign/send helper.

```ts
import { useTransaction } from "@vue-solana/vue/useTransaction";

const { status, error, execute } = useTransaction(async () => {
  return await submitCustomFlow();
});
```

`useTransaction()` centralizes loading, success, error, and timeout state for custom flows.

## Nuxt Auto-Imports

Nuxt exposes:

- `useSolanaSignAndSendTransaction()`
- `useSolanaTransactionConfirmation()`
- `useSolanaSignatureStatus()`

```vue
<script setup lang="ts">
const { signature, status, error, execute } = useSolanaSignAndSendTransaction();

async function submit(transaction: Transaction) {
  await execute(transaction, { confirm: true });
}
</script>
```

Call transaction methods from user actions on the client. Do not trigger wallet signing during SSR.

Use `useSolanaTransactionConfirmation({ commitment: "confirmed" })` and call `confirm(signature)` when you need to confirm a signature returned by another flow. Use `useSolanaSignatureStatus(signature, { pollIntervalMs: 2_000 })` when you want to keep checking status after a timeout or redirect.

## Error Handling

Transaction helpers normalize failures into `SolanaError`.

```ts
import { isSolanaError } from "@vue-solana/core/errors";

try {
  await signAndSendTransaction(connection, wallet, transaction);
} catch (error) {
  if (isSolanaError(error)) {
    switch (error.code) {
      case "NO_WALLET_SELECTED":
      case "WALLET_NOT_CONNECTED":
        // Ask the user to connect a wallet.
        break;
      case "WALLET_FEATURE_UNSUPPORTED":
        // Hide or disable unsupported transaction actions.
        break;
      case "USER_REJECTED":
        // The user declined the wallet prompt.
        break;
      case "TRANSACTION_TIMEOUT":
        // Check signature status before retrying.
        break;
      case "RPC_FAILURE":
        // RPC send or confirmation failed.
        console.error(error.cause);
        break;
    }
  }
}
```

## Safety Checklist

- Show users what they are about to sign before opening a wallet prompt.
- Never sign or send transactions without explicit user action.
- Never request or handle private keys.
- Check wallet capabilities before showing signing actions.
- Treat RPC and wallet errors as untrusted data; map them to safe UI messages.
- After a timeout, check signature status before retrying to avoid duplicate submissions.
- Preserve the submitted signature in the UI even when confirmation fails or times out.
- Link to the correct Solana Explorer cluster so users do not mistake devnet and mainnet transactions.
