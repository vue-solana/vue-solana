<script setup lang="ts">
import { computed, ref } from "vue";
import { Buffer } from "@vue-solana/nuxt/buffer-polyfill";
import { createSignableMessage } from "@vue-solana/nuxt/kit";

const wallet = useSolanaWallet();
const chain = "solana:devnet";
const messageToSign = ref("Sign in to Vue Solana with a Kit signer");

// A ref makes every signer follow the connected account address.
const account = wallet.publicKey;
const messageSigner = useSolanaWalletAccountMessageSigner(account);
const transactionSigner = useSolanaWalletAccountTransactionSigner(account, chain);
const sendingSigner = useSolanaWalletAccountTransactionSendingSigner(account, chain);

const signing = ref(false);
const signature = ref<Uint8Array | null>(null);
const signedContent = ref<Uint8Array | null>(null);
const error = ref<unknown>(null);

function addressOf(signer: { readonly address: string }) {
  try {
    return signer.address;
  } catch {
    return null;
  }
}

const signerAddress = computed(() => addressOf(messageSigner));
const transactionSignerAddress = computed(() => addressOf(transactionSigner));
const sendingSignerAddress = computed(() => addressOf(sendingSigner));

const ready = computed(
  () => wallet.connected.value && Boolean(account.value) && messageToSign.value.trim().length > 0,
);
const disabledReason = computed(() => {
  if (!account.value) {
    return "Select a discovered wallet first.";
  }

  if (!wallet.connected.value) {
    return "Connect the selected wallet to use wallet account signers.";
  }

  if (!messageToSign.value.trim()) {
    return "Enter a message to sign.";
  }

  return null;
});
const signatureBase64 = computed(() =>
  signature.value ? Buffer.from(signature.value).toString("base64") : null,
);
const signedMessageBase64 = computed(() =>
  signedContent.value ? Buffer.from(signedContent.value).toString("base64") : null,
);
const errorText = computed(() => formatError(error.value));

async function signWithKitSigner() {
  signing.value = true;
  signature.value = null;
  signedContent.value = null;
  error.value = null;

  try {
    const [result] = await messageSigner.modifyAndSignMessages([
      createSignableMessage(messageToSign.value),
    ]);
    const bytes = result?.signatures[messageSigner.address];

    if (!result || !bytes) {
      throw new Error("The wallet did not return a signature for the connected account.");
    }

    signature.value = bytes;
    signedContent.value = result.content;
  } catch (cause) {
    error.value = cause;
  } finally {
    signing.value = false;
  }
}
</script>

<template>
  <section class="panel" data-testid="wallet-account-signers-panel">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">useSolanaWalletAccount*Signer</p>
        <h2>Wallet Account Signers (Kit)</h2>
      </div>
      <span class="status-pill" :class="`status-pill--${signing ? 'loading' : 'idle'}`">
        {{ signing ? "signing" : "idle" }}
      </span>
    </div>

    <p>
      Exposes the connected wallet account as Kit signer interfaces. The message below is signed
      through a <code>MessageModifyingSigner</code>.
    </p>
    <p class="hint">
      All three adapters wrap the same connected account, so their addresses are identical.
    </p>

    <dl class="data-grid compact-grid">
      <div>
        <dt>MessageModifyingSigner</dt>
        <dd data-testid="kit-signer-address">{{ signerAddress ?? "Not connected" }}</dd>
      </div>
      <div>
        <dt>Chain</dt>
        <dd data-testid="kit-signer-chain">{{ chain }}</dd>
      </div>
      <div class="data-grid__wide">
        <dt>TransactionModifyingSigner</dt>
        <dd data-testid="kit-transaction-signer-address">
          {{ transactionSignerAddress ?? "Not connected" }}
        </dd>
      </div>
      <div class="data-grid__wide">
        <dt>TransactionSendingSigner</dt>
        <dd data-testid="kit-sending-signer-address">
          {{ sendingSignerAddress ?? "Not connected" }}
        </dd>
      </div>
    </dl>

    <label>
      Message
      <input v-model="messageToSign" data-testid="kit-signer-message" placeholder="Enter message" />
    </label>

    <div class="actions">
      <button
        type="button"
        data-testid="kit-signer-sign"
        :disabled="!ready || signing"
        @click="signWithKitSigner"
      >
        {{ signing ? "Signing..." : "Sign with Kit signer" }}
      </button>
    </div>
    <p v-if="disabledReason" class="help-text" data-testid="kit-signer-disabled-reason">
      {{ disabledReason }}
    </p>
    <p class="result" data-testid="kit-signer-signature">
      Signature: {{ signatureBase64 ?? "No signature yet" }}
    </p>
    <p v-if="signedMessageBase64" class="result" data-testid="kit-signer-signed-message">
      Signed message: {{ signedMessageBase64 }}
    </p>
    <p v-if="errorText" class="error">{{ errorText }}</p>
  </section>
</template>
