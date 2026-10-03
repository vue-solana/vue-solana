<script setup lang="ts">
import { computed, ref } from "vue";
import { Buffer } from "@vue-solana/nuxt/buffer-polyfill";

const wallet = useSolanaWallet();
const signMessage = useSolanaSignMessage();

const messageToSign = ref("Sign in to Vue Solana on devnet");

const walletConfigured = computed(() => Boolean(wallet.wallet.value));
const signMessageReady = computed(
  () =>
    wallet.connected.value &&
    wallet.canSignMessage.value &&
    messageToSign.value.trim().length > 0 &&
    !signMessage.loading.value,
);
const signMessageDisabledReason = computed(() => {
  if (!walletConfigured.value) {
    return "Select a discovered wallet first.";
  }

  if (!wallet.connected.value) {
    return "Connect the selected wallet to enable message signing.";
  }

  if (!wallet.canSignMessage.value) {
    return "Selected wallet does not support message signing.";
  }

  if (!messageToSign.value.trim()) {
    return "Enter a message to sign.";
  }

  return null;
});
const signedMessageBase64 = computed(() =>
  signMessage.signedMessage.value
    ? Buffer.from(signMessage.signedMessage.value).toString("base64")
    : null,
);
const messageSignatureBase64 = computed(() =>
  signMessage.signature.value ? Buffer.from(signMessage.signature.value).toString("base64") : null,
);
const signMessageError = computed(() => formatError(signMessage.error.value));

async function signWalletMessage() {
  await signMessage.execute(new TextEncoder().encode(messageToSign.value.trim()));
}
</script>

<template>
  <section class="panel" data-testid="message-signing-panel">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">useSolanaSignMessage</p>
        <h2>Message Signing</h2>
      </div>
      <span class="status-pill" :class="`status-pill--${signMessage.status.value}`">
        {{ signMessage.status }}
      </span>
    </div>

    <p>
      Signs a plain devnet auth challenge with the connected wallet. This proves wallet control; it
      does not create or submit a transaction.
    </p>

    <dl class="data-grid compact-grid">
      <div>
        <dt>Wallet ready</dt>
        <dd data-testid="message-wallet-ready">{{ wallet.connected.value ? "Yes" : "No" }}</dd>
      </div>
      <div>
        <dt>Can sign messages</dt>
        <dd data-testid="message-capability">{{ wallet.canSignMessage.value ? "Yes" : "No" }}</dd>
      </div>
    </dl>

    <label>
      Message
      <input v-model="messageToSign" data-testid="message-to-sign" placeholder="Enter message" />
    </label>

    <div class="actions">
      <button
        type="button"
        data-testid="sign-message"
        :disabled="!signMessageReady"
        @click="signWalletMessage"
      >
        {{ signMessage.loading.value ? "Signing..." : "Sign Message" }}
      </button>
    </div>
    <p v-if="signMessageDisabledReason" class="hint" data-testid="message-disabled-reason">
      {{ signMessageDisabledReason }}
    </p>
    <p class="result" data-testid="message-signature">
      Signature: {{ messageSignatureBase64 ?? "No signature yet" }}
    </p>
    <p v-if="signedMessageBase64" class="result" data-testid="signed-message">
      Signed message: {{ signedMessageBase64 }}
    </p>
    <p v-if="signMessageError" class="error">{{ signMessageError }}</p>
  </section>
</template>
