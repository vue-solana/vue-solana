---
title: "Transactions"
description: Sign, send, confirm, and handle transaction state with Vue Solana.
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

## Vue Sign and Send Flow

Use `useSignAndSendTransaction()` when a Vue component needs reactive status, errors, and optional confirmation.

```vue
<script setup lang="ts">
import { Transaction } from "@solana/web3-compat";
import { computed } from "vue";
import { useSignAndSendTransaction } from "@vue-solana/vue/useSignAndSendTransaction";
import { useWallet } from "@vue-solana/vue/useWallet";

const { connected, canSignTransaction } = useWallet();
const { signature, confirmation, status, error, execute } = useSignAndSendTransaction({
  confirm: true,
  commitment: "confirmed",
});

const canSubmit = computed(() => connected.value && canSignTransaction.value);

async function submitTransaction() {
  const transaction = new Transaction();

  await execute(transaction);
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

This example uses an empty transaction as a placeholder. Real apps must add valid instructions, recent blockhash data, and fee payer configuration before requesting a signature.

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
const { signature, status, error, execute } = useSolanaSignAndSendTransaction({
  confirm: true,
});
</script>
```

Call transaction methods from user actions on the client. Do not trigger wallet signing during SSR.

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
