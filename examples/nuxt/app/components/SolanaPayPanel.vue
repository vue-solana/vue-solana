<script setup lang="ts">
import { computed, ref } from "vue";
import { address, isAddress } from "@vue-solana/nuxt/kit";

interface ParsedTransferRequest {
  recipient?: string;
  amount?: bigint;
  splToken?: string;
  reference?: string | string[];
  label?: string;
  message?: string;
  memo?: string;
}

interface VerificationResult {
  status: string;
  verified: boolean;
  signature?: string;
  reason?: string;
}

const SOL_DECIMALS = 9;
const LAMPORTS_PER_SOL = 10n ** BigInt(SOL_DECIMALS);

const { rpc } = useSolanaClient();
const pay = useSolanaPay();
const qr = useSolanaQrCode();
const confirmation = useSolanaPayConfirmation();

const recipient = ref("");
const amount = ref("0.001");
const label = ref("Example store");
const message = ref("Order 1042");
const memo = ref("order-1042");
const splToken = ref("");

const createError = ref<unknown>(null);
const verification = ref<VerificationResult | null>(null);
const polling = ref(false);

const amountLamports = computed<bigint | null>(() => {
  const raw = amount.value.trim();

  if (!/^\d+(\.\d{1,9})?$/.test(raw)) {
    return null;
  }

  const [whole = "0", fraction = ""] = raw.split(".");
  return BigInt(whole) * LAMPORTS_PER_SOL + BigInt(fraction.padEnd(SOL_DECIMALS, "0") || "0");
});
const recipientValid = computed(() => isAddress(recipient.value.trim()));
const splTokenValid = computed(
  () => splToken.value.trim() === "" || isAddress(splToken.value.trim()),
);
const createReady = computed(
  () =>
    recipientValid.value &&
    splTokenValid.value &&
    amountLamports.value !== null &&
    amountLamports.value > 0n &&
    !pay.loading.value,
);
const createDisabledReason = computed(() => {
  if (!recipientValid.value) {
    return "Enter a valid recipient address.";
  }

  if (!splTokenValid.value) {
    return "Enter a valid SPL token mint or leave the field empty.";
  }

  if (amountLamports.value === null || amountLamports.value <= 0n) {
    return "Enter an amount greater than 0 SOL.";
  }

  return null;
});
const parsedRequest = computed(
  () => (pay.parsedRequest.value as ParsedTransferRequest | null) ?? null,
);
const referenceText = computed(() =>
  pay.reference.value ? String(pay.reference.value) : "No reference yet",
);
const referenceList = computed(() => {
  const references = parsedRequest.value?.reference;

  if (!references) {
    return [];
  }

  return Array.isArray(references) ? references.map(String) : [String(references)];
});
const qrMarkup = computed(() => (typeof qr.svg.value === "string" ? qr.svg.value : ""));
const payStatus = computed(() => pay.status.value);
const payError = computed(() =>
  formatError(createError.value ?? pay.error.value ?? qr.error.value),
);
const confirmationError = computed(() => formatError(confirmation.error.value));

function lamportsToSol(lamports: bigint): string {
  const whole = lamports / LAMPORTS_PER_SOL;
  const fraction = (lamports % LAMPORTS_PER_SOL)
    .toString()
    .padStart(SOL_DECIMALS, "0")
    .replace(/0+$/, "");

  return fraction ? `${whole}.${fraction}` : String(whole);
}

function parsedAmountText(parsed: ParsedTransferRequest | null): string {
  if (!parsed?.amount) {
    return "Not set";
  }

  return `${lamportsToSol(parsed.amount)} SOL`;
}

function stopWatching() {
  polling.value = false;
  confirmation.stopPolling();
}

async function createRequest() {
  if (!createReady.value) {
    return;
  }

  createError.value = null;
  verification.value = null;
  stopWatching();

  try {
    const url = await pay.createTransferRequest({
      recipient: address(recipient.value.trim()),
      amount: amountLamports.value,
      ...(label.value.trim() ? { label: label.value.trim() } : {}),
      ...(message.value.trim() ? { message: message.value.trim() } : {}),
      ...(memo.value.trim() ? { memo: memo.value.trim() } : {}),
      ...(splTokenValid.value && splToken.value.trim()
        ? { splToken: address(splToken.value.trim()) }
        : {}),
    });

    await qr.generate(url, { size: 260 });
  } catch (error) {
    createError.value = error;
  }
}

async function verifySettlement() {
  if (!pay.reference.value) {
    return;
  }

  createError.value = null;
  verification.value = null;

  try {
    const result = await pay.confirmTransfer({ timeoutMs: 5_000 });
    verification.value = result as VerificationResult;
  } catch (error) {
    createError.value = error;
  }
}

function startWatching() {
  if (!pay.reference.value) {
    return;
  }

  polling.value = true;
  confirmation.startPolling(rpc, String(pay.reference.value), 2_000);
}

function resetRequest() {
  stopWatching();
  pay.reset();
  qr.reset();
  verification.value = null;
  createError.value = null;
}
</script>

<template>
  <section class="panel panel--wide" data-testid="solana-pay-panel">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">useSolanaPay + useSolanaQrCode</p>
        <h2>Solana Pay Request And QR</h2>
      </div>
      <span class="status-pill" :class="`status-pill--${payStatus}`" data-testid="pay-status">
        {{ payStatus }}
      </span>
    </div>

    <p>
      Merchant side: build a <code>solana:</code> transfer request, generate a payment reference,
      and render it as a QR code. A reference is what lets you find the payment on chain later, so
      the QR and the settlement check must use the same request.
    </p>

    <div class="pay-form">
      <label>
        Recipient address
        <input
          v-model="recipient"
          data-testid="pay-recipient"
          placeholder="Enter the merchant public key"
        />
      </label>
      <label>
        Amount in SOL
        <input v-model="amount" data-testid="pay-amount" inputmode="decimal" placeholder="0.001" />
      </label>
      <label>
        SPL token mint (optional)
        <input
          v-model="splToken"
          data-testid="pay-spl-token"
          placeholder="Leave empty for native SOL"
        />
      </label>
      <label>
        Label
        <input v-model="label" data-testid="pay-label" placeholder="Example store" />
      </label>
      <label>
        Message
        <input v-model="message" data-testid="pay-message" placeholder="Order 1042" />
      </label>
      <label>
        Memo
        <input v-model="memo" data-testid="pay-memo" placeholder="order-1042" />
      </label>
    </div>

    <div class="actions">
      <button
        type="button"
        data-testid="create-pay-request"
        :disabled="!createReady"
        @click="createRequest"
      >
        {{ pay.loading.value ? "Creating..." : "Create payment request" }}
      </button>
      <button
        type="button"
        data-testid="verify-payment"
        :disabled="!pay.reference.value || pay.loading.value"
        @click="verifySettlement"
      >
        Verify settlement
      </button>
      <button
        type="button"
        data-testid="toggle-payment-watch"
        :disabled="!pay.reference.value"
        @click="polling ? stopWatching() : startWatching()"
      >
        {{ polling ? "Stop watching" : "Watch status" }}
      </button>
      <button
        type="button"
        data-testid="reset-pay-request"
        :disabled="!pay.requestUrl.value"
        @click="resetRequest"
      >
        Reset
      </button>
    </div>
    <p v-if="createDisabledReason" class="hint" data-testid="pay-disabled-reason">
      {{ createDisabledReason }}
    </p>

    <dl class="data-grid compact-grid">
      <div>
        <dt>Request URL</dt>
        <dd data-testid="pay-request-url">{{ pay.requestUrl.value ?? "No request yet" }}</dd>
      </div>
      <div>
        <dt>Reference</dt>
        <dd data-testid="pay-reference">{{ referenceText }}</dd>
      </div>
      <div>
        <dt>Parsed recipient</dt>
        <dd data-testid="pay-parsed-recipient">
          {{ parsedRequest?.recipient ?? "No recipient yet" }}
        </dd>
      </div>
      <div>
        <dt>Parsed amount</dt>
        <dd data-testid="pay-parsed-amount">{{ parsedAmountText(parsedRequest) }}</dd>
      </div>
      <div>
        <dt>Parsed label</dt>
        <dd data-testid="pay-parsed-label">{{ parsedRequest?.label ?? "No label" }}</dd>
      </div>
      <div>
        <dt>Parsed memo</dt>
        <dd data-testid="pay-parsed-memo">{{ parsedRequest?.memo ?? "No memo" }}</dd>
      </div>
      <div>
        <dt>References in URL</dt>
        <dd data-testid="pay-reference-count">{{ referenceList.length }}</dd>
      </div>
      <div>
        <dt>Cheap status polling</dt>
        <dd data-testid="pay-polling-status">
          {{ polling ? confirmation.status.value : "not polling" }}
        </dd>
      </div>
    </dl>

    <div v-if="qrMarkup" class="solana-pay-qr" data-testid="pay-qr" v-html="qrMarkup" />

    <dl v-if="verification" class="data-grid compact-grid" data-testid="pay-verification">
      <div>
        <dt>Verification status</dt>
        <dd>{{ verification.status }}</dd>
      </div>
      <div>
        <dt>Verified</dt>
        <dd>{{ verification.verified ? "yes" : "no" }}</dd>
      </div>
      <div>
        <dt>Signature</dt>
        <dd>{{ verification.signature ?? "No signature" }}</dd>
      </div>
      <div>
        <dt>Reason</dt>
        <dd>{{ verification.reason ?? "none" }}</dd>
      </div>
    </dl>

    <p class="hint">
      Verification polls <code>getSignaturesForAddress(reference)</code> for up to five seconds,
      then confirms the transaction pays the expected recipient and amount. A request that was never
      paid reports <code>expired</code>: nothing settled under this reference.
    </p>
    <p v-if="payError" class="error" data-testid="pay-error">{{ payError }}</p>
    <p v-if="confirmationError" class="error" data-testid="pay-polling-error">
      {{ confirmationError }}
    </p>
  </section>
</template>
