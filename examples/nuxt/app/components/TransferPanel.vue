<script setup lang="ts">
import { computed, ref } from "vue";
import {
  AccountRole,
  address,
  appendTransactionMessageInstruction,
  compileTransaction,
  createTransactionMessage,
  getTransactionEncoder,
  isAddress,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
} from "@vue-solana/nuxt/kit";

const SYSTEM_PROGRAM_ADDRESS = address("11111111111111111111111111111111");

const { client } = useSolanaClient();
const rpc = useSolanaRpc();
const wallet = useSolanaWallet();
const sendTransaction = useSolanaSignAndSendTransaction();

const transferRecipient = ref("");
const transferAmount = ref("0.000001");
const devnetTransferError = ref<unknown>(null);

const walletConfigured = computed(() => Boolean(wallet.wallet.value));
const transferLamports = computed(() => {
  const amount = Number(transferAmount.value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.round(amount * 1_000_000_000);
});
const recipientAddressValid = computed(() => isAddress(transferRecipient.value.trim()));
const signAndSendReady = computed(
  () =>
    wallet.connected.value &&
    recipientAddressValid.value &&
    Boolean(transferLamports.value) &&
    !sendTransaction.loading.value,
);
const signAndSendStatus = computed(() => {
  if (sendTransaction.status.value !== "idle") {
    return sendTransaction.status.value;
  }

  return wallet.connected.value ? "ready" : "waiting";
});
const transferExplorerUrl = computed(() => {
  const signature = sendTransaction.signature.value;

  if (!signature) {
    return null;
  }

  return `https://explorer.solana.com/tx/${signature}?cluster=${rpc.cluster.value}`;
});
const signAndSendDisabledReason = computed(() => {
  if (!walletConfigured.value) {
    return "Select a discovered wallet first.";
  }

  if (!wallet.connected.value) {
    return "Connect the selected wallet to enable transfers.";
  }

  if (!recipientAddressValid.value) {
    return "Enter a valid Solana recipient address.";
  }

  if (!transferLamports.value) {
    return "Enter an amount greater than 0 SOL.";
  }

  return null;
});
const sendTransactionError = computed(() =>
  formatError(devnetTransferError.value ?? sendTransaction.error.value),
);

function createTransferInstruction(fromPubkey: Address, toPubkey: Address, lamports: number) {
  const data = new Uint8Array(12);
  const view = new DataView(data.buffer);

  view.setUint32(0, 2, true);
  view.setBigUint64(4, BigInt(lamports), true);

  return {
    programAddress: SYSTEM_PROGRAM_ADDRESS,
    accounts: [
      { address: fromPubkey, role: AccountRole.WRITABLE_SIGNER },
      { address: toPubkey, role: AccountRole.WRITABLE },
    ],
    data,
  };
}

async function sendDevnetTransfer() {
  const fromPubkey = wallet.publicKey.value;
  const lamports = transferLamports.value;

  if (!fromPubkey || !lamports) {
    return;
  }

  devnetTransferError.value = null;

  try {
    const toPubkey = address(transferRecipient.value.trim());
    const { value: latestBlockhash } = await client.rpc.getLatestBlockhash().send();
    const transactionMessage = appendTransactionMessageInstruction(
      createTransferInstruction(fromPubkey, toPubkey, lamports),
      setTransactionMessageLifetimeUsingBlockhash(
        latestBlockhash,
        setTransactionMessageFeePayer(fromPubkey, createTransactionMessage({ version: 0 })),
      ),
    );
    const transaction = new Uint8Array(
      getTransactionEncoder().encode(compileTransaction(transactionMessage)),
    );

    await sendTransaction.execute(transaction, {
      confirm: true,
      confirmation: { commitment: "confirmed" },
      skipPreflight: false,
    });
  } catch (error) {
    devnetTransferError.value = error;
  }
}
</script>

<template>
  <section class="panel" data-testid="transfer-panel">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">useSolanaSignAndSendTransaction</p>
        <h2>Real Devnet Transfer</h2>
      </div>
      <span class="status-pill" :class="`status-pill--${sendTransaction.status.value}`">
        {{ signAndSendStatus }}
      </span>
    </div>

    <p>
      Sends a real transfer from the connected wallet, then waits for confirmed commitment. Use
      devnet, enter a recipient public key, and start with a tiny amount such as
      <code>0.000001</code> SOL.
    </p>

    <dl class="data-grid compact-grid">
      <div>
        <dt>Wallet ready</dt>
        <dd>{{ wallet.connected.value ? "Yes" : "No" }}</dd>
      </div>
      <div>
        <dt>Submitted signature</dt>
        <dd>{{ sendTransaction.signature.value ?? "No signature yet" }}</dd>
      </div>
      <div>
        <dt>Confirmation state</dt>
        <dd data-testid="transfer-confirmation-state">{{ sendTransaction.status.value }}</dd>
      </div>
    </dl>

    <label>
      Recipient address
      <input v-model="transferRecipient" placeholder="Enter recipient public key" />
    </label>
    <label>
      Amount in SOL
      <input v-model="transferAmount" inputmode="decimal" placeholder="0.000001" />
    </label>

    <div class="actions">
      <button
        type="button"
        data-testid="send-transfer"
        :disabled="!signAndSendReady"
        @click="sendDevnetTransfer"
      >
        {{ sendTransaction.loading.value ? "Sending..." : "Send Devnet Transfer" }}
      </button>
    </div>
    <p v-if="signAndSendDisabledReason" class="hint" data-testid="transfer-disabled-reason">
      {{ signAndSendDisabledReason }}
    </p>
    <p class="result" data-testid="transfer-signature">
      Signature: {{ sendTransaction.signature.value ?? "No signature yet" }}
    </p>
    <p v-if="transferExplorerUrl" class="result" data-testid="transfer-explorer-link">
      Explorer:
      <a :href="transferExplorerUrl" target="_blank" rel="noreferrer">View transaction</a>
    </p>
    <p v-if="sendTransactionError" class="error">{{ sendTransactionError }}</p>
  </section>
</template>
