---
title: "Message Signing"
description: Sign authentication or ownership messages without creating on-chain transactions.
ogSection: Guides
surroundOrder: 12
---

Message signing proves wallet control for an off-chain message. It does not authorize on-chain state changes and it is not a transaction signature.

Use message signing for authentication challenges, account ownership checks, or consent text that your app verifies off chain.

## Vue Message Signing

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useSignMessage } from "@vue-solana/vue/useSignMessage";
import { useWallet } from "@vue-solana/vue/useWallet";

const { connected, canSignMessage } = useWallet();
const { signature, status, error, execute } = useSignMessage();

const canSign = computed(() => connected.value && canSignMessage.value);

async function signIn() {
  const message = new TextEncoder().encode("Sign in to example.com");
  await execute(message);
}
</script>

<template>
  <section>
    <button type="button" :disabled="!canSign" @click="signIn">Sign message</button>
    <p>Status: {{ status }}</p>
    <p v-if="signature">Signature bytes: {{ signature.length }}</p>
    <p v-if="error">Unable to sign message.</p>
  </section>
</template>
```

Wallets that do not expose message signing report `canSignMessage` as false. Calling `execute()` without support rejects with `WALLET_FEATURE_UNSUPPORTED`.

## Nuxt Message Signing

Nuxt auto-imports `useSolanaSignMessage()` and `useSolanaWallet()`.

```vue
<script setup lang="ts">
const { connected, canSignMessage } = useSolanaWallet();
const { signature, status, error, execute } = useSolanaSignMessage();

async function signChallenge() {
  await execute(new TextEncoder().encode("Sign in to my Nuxt app"));
}
</script>
```

Only call message signing from user actions on the client.

## Challenge Text

Use clear, app-specific challenge text. Users should understand what they are signing.

Good challenge text usually includes:

- App or domain name.
- Purpose of the signature.
- Nonce or one-time challenge value.
- Issued-at time and expiration time.

Example:

```txt
Sign in to example.com
Wallet: 8Y...abc
Nonce: 7f4b3c
Issued At: 2026-07-02T12:00:00Z
Expires At: 2026-07-02T12:10:00Z
```

## Verification Boundary

Vue Solana helps request the wallet signature. Your app is responsible for server-side verification, nonce storage, expiration checks, and session creation.

Do not treat a signature over generic text as permission to transfer tokens or change on-chain state.

## Error Handling

Message signing errors use the same normalized `SolanaError` model as wallet and transaction helpers.

```ts
const message = computed(() => {
  switch (error.value?.code) {
    case "NO_WALLET_SELECTED":
      return "Choose a wallet first.";
    case "WALLET_NOT_CONNECTED":
      return "Connect your wallet first.";
    case "WALLET_FEATURE_UNSUPPORTED":
      return "This wallet does not support message signing.";
    case "USER_REJECTED":
      return "The message signature was rejected.";
    default:
      return null;
  }
});
```

## Safety Checklist

- Use one-time nonces for authentication challenges.
- Expire challenges quickly.
- Verify signatures on the server before creating a session.
- Make signed text human-readable.
- Never imply that message signing submits a transaction.
- Never reuse a transaction-signing flow for authentication text.
