---
type: Guide
title: Message Signing For Authentication
description: Use Solana wallet message signing for wallet-auth challenges without submitting on-chain transactions.
tags:
  - wallets
  - message-signing
  - authentication
  - useSignMessage
resource: https://solana.com/docs
timestamp: 2025-07-17T00:00:00Z
---

# Message Signing For Authentication

Use message signing for wallet-auth challenges only after a wallet is selected and connected, and only when `useWallet().canSignMessage` is true. Message signing proves that the connected wallet can sign a specific byte message; it does not sign or authorize a Solana transaction.

## Vue Example

```ts
import { useSignMessage } from "@vue-solana/vue/useSignMessage";
import { useWallet } from "@vue-solana/vue/useWallet";

const wallet = useWallet();
const signMessage = useSignMessage();

async function signIn(nonce: string) {
  if (!wallet.connected.value) {
    throw new Error("Connect a wallet first");
  }

  if (!wallet.canSignMessage.value) {
    throw new Error("Selected wallet does not support message signing");
  }

  const message = new TextEncoder().encode(`Sign in to example.com: ${nonce}`);
  const result = await signMessage.execute(message);

  return {
    publicKey: wallet.publicKey.value?.toBase58(),
    message: result.signedMessage,
    signature: result.signature,
  };
}
```

## Server-Side Verification

Server-side auth flows should generate a fresh nonce, verify the returned signature against the exact signed message bytes and wallet public key, expire used nonces, and bind the challenge to your origin and intended action.

## Related

- [Wallet Support](./wallets.md)
