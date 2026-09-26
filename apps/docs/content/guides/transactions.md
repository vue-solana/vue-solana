---
title: "Transactions"
description: Sign, send, confirm, and handle transaction state with Vue Solana.
ogSection: Guides
surroundOrder: 11
---

Vue Solana provides wallet-aware helpers for submitting transactions and composables for reactive transaction state.

This guide covers the Vue Solana boundary: wallet capability checks, signing, sending, confirmation, and errors. Build transaction messages with `@solana/kit` and your program client's instruction helpers.

## Core Send Helper

Use `signAndSendTransaction()` from `@vue-solana/core/transaction` when you already have a Kit client, wallet, and raw wire transaction bytes.

```ts
import { signAndSendTransaction } from "@vue-solana/core/transaction";

const signature = await signAndSendTransaction(client, wallet, transaction, {
  skipPreflight: false,
});
```

The helper returns the RPC signature string.

For Android Mobile Wallet Adapter wallets, Vue Solana prefers `signTransaction` plus app-side RPC submission through `client.rpc.sendTransaction(...).send()` when available so the app owns submission and can reliably return the RPC signature after the wallet handoff.

## Confirm a Signature

Use `confirmTransactionSignature()` when you need to wait until a submitted signature reaches a commitment level.

```ts
import { confirmTransactionSignature } from "@vue-solana/core/transaction";

const confirmation = await confirmTransactionSignature(client, signature, {
  commitment: "confirmed",
  timeoutMs: 60_000,
});

console.log(confirmation.signature, confirmation.commitment);
```

Confirmation defaults to `confirmed` commitment and a 60 second timeout. It polls `client.rpc.getSignatureStatuses([signature]).send()`, so the transaction must already be submitted.

## Client-Sent Transactions

`createSolanaClient()` composes the official `@solana/kit-plugin-rpc` transaction stack by default: `solanaRpc()`, `rpcTransactionPlanner()`, and `rpcTransactionPlanSendingExecutor()`. The old custom fallback sender is not used.

Use `useSendTransaction()` or `useSendTransactions()` when the client should plan, sign, submit, and confirm without a wallet popup. The official executor fetches a fresh blockhash, handles resource limits and preflight simulation, signs with the client signers, submits through RPC, and waits for `confirmed` commitment. The composable sets `status` to `sent` only after that send-and-confirm operation completes. A single result exposes `data.context.signature`; a batch result contains the plan result tree.

Configure a direct core or Vue client with `payer` or `payerSecretKey`, or provide a transaction message with an embedded signer. `payerSecretKey` is a base64-encoded 64-byte Ed25519 keypair and is only appropriate for trusted development or server-side flows. Never put a raw secret or `payerSecretKey` in Nuxt public runtime config, and never expose a funded signing key to an end-user browser.

The wallet flow is separate: `useSignAndSendTransaction()` can return after RPC submission by default, or wait for a selected commitment with `confirm: true`. Keep that behavior when a connected user must approve a transaction in their wallet.

## Build A Real Devnet Transfer

This example creates a tiny system transfer on devnet. It builds a Kit v0 transaction message and serializes it to wire bytes that Vue Solana hands to the wallet for signing.

Browser apps that create or serialize transactions should initialize the Vue package Buffer polyfill once before transaction code runs:

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/vue/buffer-polyfill";

installSolanaBufferPolyfill();
```

```ts
import {
  AccountRole,
  address,
  appendTransactionMessageInstruction,
  compileTransaction,
  createTransactionMessage,
  getTransactionEncoder,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
} from "@solana/kit";

const SYSTEM_PROGRAM_ADDRESS = address("11111111111111111111111111111111");

function createTransferInstruction(from: Address, to: Address, lamports: number) {
  const data = new DataView(new ArrayBuffer(12));
  data.setUint32(0, 2, true); // System program transfer instruction index
  data.setBigUint64(4, BigInt(lamports), true);

  return {
    programAddress: SYSTEM_PROGRAM_ADDRESS,
    accounts: [
      { address: from, role: AccountRole.WRITABLE_SIGNER },
      { address: to, role: AccountRole.WRITABLE },
    ],
    data: new Uint8Array(data.buffer),
  };
}

async function createTransferTransaction(params: {
  rpc: { getLatestBlockhash(): { send(): Promise<{ value: { blockhash: string } }> } };
  from: Address;
  to: string;
  lamports: number;
}) {
  const recipient = address(params.to);
  const { value: latestBlockhash } = await params.rpc.getLatestBlockhash().send();

  const message = setTransactionMessageLifetimeUsingBlockhash(
    latestBlockhash,
    setTransactionMessageFeePayer(
      params.from,
      appendTransactionMessageInstruction(
        createTransferInstruction(params.from, recipient, params.lamports),
        createTransactionMessage({ version: 0 }),
      ),
    ),
  );

  return getTransactionEncoder().encode(compileTransaction(message));
}
```

`createTransferTransaction` returns raw wire transaction bytes (`Uint8Array`), which is what `SolanaWallet.signTransaction` and `useSignAndSendTransaction()` accept.

Use devnet SOL while testing. Start with a tiny value such as `1_000` lamports (`0.000001` SOL). Never use a wallet with real funds while validating a tutorial or example flow.

## Vue Sign and Send Flow

Use `useSignAndSendTransaction()` when a Vue component needs reactive status, errors, and optional confirmation.

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useSignAndSendTransaction } from "@vue-solana/vue/useSignAndSendTransaction";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";
import { useWallet } from "@vue-solana/vue/useWallet";

const recipient = ref("PASTE_DEVNET_RECIPIENT_ADDRESS");
const lamports = ref(1_000);
const { client } = useSolanaClient();
const { publicKey, connected, canSignTransaction } = useWallet();
const { signature, confirmation, status, error, execute } = useSignAndSendTransaction();

const canSubmit = computed(() => connected.value && canSignTransaction.value);

async function submitTransaction() {
  const from = publicKey.value;
  if (!from) return;

  const transaction = await createTransferTransaction({
    rpc: client.rpc,
    from,
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

### Wallet Request Inputs and Returns

Wallet signing flows accept transaction input as raw `Uint8Array` wire bytes that conform to the Solana transaction schema. Build them with `@solana/kit` (or decode them from a base64/base58 RPC response); base64 strings, transaction objects, and instruction lists are not accepted here.

```ts
import { compileTransaction, getTransactionEncoder } from "@solana/kit";

const transaction: Uint8Array = getTransactionEncoder().encode(compileTransaction(message));
await execute(transaction);
```

`useSignMessage()` takes the raw message bytes to sign. Every wallet send request also accepts the Kit `SendTransactionOptions`:

| Option                | Description                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| `skipPreflight`       | Skip preflight simulation before sending.                                                                     |
| `maxRetries`          | RPC node retry count (`bigint`).                                                                              |
| `minContextSlot`      | Slot at which any blockhash or nonce in the transaction is known to exist; sending before it can be rejected. |
| `preflightCommitment` | Commitment used for preflight simulation.                                                                     |

Return shapes:

- `useSignMessage().execute(bytes)` resolves to `{ signedMessage, signature }`, both `Uint8Array`.
- `useSignTransactions().execute(transactions)` resolves to the signed `Uint8Array[]` (also exposed as `signedTransactions`); pass a single-element array for one transaction.
- `useSignAndSendTransaction().execute(transaction)` resolves to the submitted `signature` string; with `confirm: true` it also fills `confirmation`.
- `useSignAndSendTransactions().execute(transactions)` resolves to a `string[]` of signatures (also exposed as `signatures`).

A wallet may modify the message or transaction before signing — for example to add its own instruction or change the fee payer — and the Wallet Standard explicitly allows it. Re-read the returned `signedMessage` or signed transaction bytes instead of assuming they match your input byte-for-byte.

## Explorer Links

Explorer links should match the cluster your app is using.

```ts
function explorerUrl(signature: string, cluster: string) {
  const suffix = cluster === "mainnet" || cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}
```

For devnet, links should look like `https://explorer.solana.com/tx/SIGNATURE?cluster=devnet`. Both `mainnet` and the legacy `mainnet-beta` alias intentionally omit the cluster query.

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
- `useSolanaSendTransaction()`
- `useSolanaSendTransactions()`
- `useSolanaTransactionConfirmation()`
- `useSolanaSignatureStatus()`

```vue
<script setup lang="ts">
const { signature, status, error, execute } = useSolanaSignAndSendTransaction();

async function submit(transaction: Uint8Array) {
  await execute(transaction, { confirm: true });
}
</script>
```

Call transaction methods from user actions on the client. Do not trigger wallet signing during SSR. Nuxt module options intentionally omit `payer` and `payerSecretKey`; configure a signer in a client-only Vue plugin or use an embedded connected-wallet signer instead of placing a secret in public runtime config.

Use `useSolanaTransactionConfirmation({ commitment: "confirmed" })` and call `confirm(signature)` when you need to confirm a signature returned by another flow. Use `useSolanaSignatureStatus(signature, { pollIntervalMs: 2_000 })` when you want to keep checking status after a timeout or redirect.

## Error Handling

Transaction helpers normalize failures into `SolanaError`.

```ts
import { isSolanaError } from "@vue-solana/core/errors";

try {
  await signAndSendTransaction(client, wallet, transaction);
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

- Keep client-sent signing keys on a trusted server or in an explicitly ephemeral demo signer; never expose funded secrets through Nuxt public runtime config.
- Show users what they are about to sign before opening a wallet prompt.
- Never sign or send transactions without explicit user action.
- Never request or handle private keys.
- Check wallet capabilities before showing signing actions.
- Treat RPC and wallet errors as untrusted data; map them to safe UI messages.
- After a timeout, check signature status before retrying to avoid duplicate submissions.
- Preserve the submitted signature in the UI even when confirmation fails or times out.
- Link to the correct Solana Explorer cluster so users do not mistake devnet and mainnet transactions.
