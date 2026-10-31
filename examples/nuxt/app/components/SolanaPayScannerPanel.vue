<script setup lang="ts">
import { computed, ref } from "vue";

interface ParsedPaymentRequest {
  recipient?: string;
  amount?: bigint;
  splToken?: string;
  reference?: string | string[];
  label?: string;
  message?: string;
  memo?: string;
  link?: string;
}

const SOL_DECIMALS = 9;
const LAMPORTS_PER_SOL = 10n ** BigInt(SOL_DECIMALS);

const scanner = useSolanaQrScanner();

const video = ref<HTMLVideoElement | null>(null);
const pastedUrl = ref("");
const pasteError = ref<unknown>(null);

const cameraSupported = computed(
  () => typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia),
);
const barcodeDetectorSupported = computed(
  () => typeof globalThis !== "undefined" && "BarcodeDetector" in globalThis,
);
const parsedRequest = computed(() => (scanner.parsed.value as ParsedPaymentRequest | null) ?? null);
const scanResult = computed(() =>
  scanner.result.value && scanner.parsed.value ? String(scanner.result.value) : null,
);
const scannerError = computed(() => formatError(pasteError.value ?? scanner.error.value) ?? null);
const isTransactionRequest = computed(() => Boolean(parsedRequest.value?.link));
const references = computed(() => {
  const value = parsedRequest.value?.reference;

  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value.map(String) : [String(value)];
});
const amountText = computed(() => {
  const lamports = parsedRequest.value?.amount;

  if (!lamports) {
    return "Not set";
  }

  const whole = lamports / LAMPORTS_PER_SOL;
  const fraction = (lamports % LAMPORTS_PER_SOL)
    .toString()
    .padStart(SOL_DECIMALS, "0")
    .replace(/0+$/, "");

  return `${fraction ? `${whole}.${fraction}` : String(whole)} ${parsedRequest.value?.splToken ? "token units" : "SOL"}`;
});

function resetScan() {
  pasteError.value = null;
  scanner.reset();
}

async function validatePastedUrl() {
  const value = pastedUrl.value.trim();

  if (!value) {
    pasteError.value = new Error("Paste a Solana Pay URL first.");
    return;
  }

  pasteError.value = null;

  try {
    await scanner.scanFromText(value);
  } catch (error) {
    pasteError.value = error;
  }
}

async function startScanner() {
  pasteError.value = null;

  try {
    await scanner.start({ video: video.value ?? undefined, scanIntervalMs: 500 });
  } catch (error) {
    pasteError.value = error;
  }
}
</script>

<template>
  <section class="panel panel--wide" data-testid="solana-pay-scanner-panel">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">useSolanaQrScanner</p>
        <h2>Scan And Preview A Payment</h2>
      </div>
      <span
        class="status-pill"
        :class="`status-pill--${scanner.scanning.value ? 'scanning' : 'idle'}`"
        data-testid="scanner-status"
      >
        {{ scanner.scanning.value ? "scanning" : "idle" }}
      </span>
    </div>

    <p>
      Payer side: scan a merchant QR code or paste the URL, then inspect exactly what the wallet
      will be asked to pay. Scanned data is untrusted input, so nothing here signs or sends a
      transaction. Confirm the details, then open the request in a wallet or your own payment UI.
    </p>

    <div class="actions">
      <button
        type="button"
        data-testid="start-scanner"
        :disabled="scanner.scanning.value"
        @click="startScanner"
      >
        Start camera
      </button>
      <button
        type="button"
        data-testid="stop-scanner"
        :disabled="!scanner.scanning.value"
        @click="scanner.stop()"
      >
        Stop camera
      </button>
      <button type="button" data-testid="reset-scan" @click="resetScan">Reset</button>
    </div>

    <video v-show="scanner.scanning.value" ref="video" class="solana-pay-video" playsinline muted />
    <p v-if="!cameraSupported" class="hint" data-testid="scanner-camera-unsupported">
      This browser exposes no camera API. Paste the payment URL below instead.
    </p>
    <p v-else-if="!barcodeDetectorSupported" class="hint" data-testid="scanner-barcode-unsupported">
      This browser has no <code>BarcodeDetector</code>, so the camera cannot decode a QR code. Paste
      the payment URL below instead.
    </p>

    <div class="pay-form">
      <label>
        Payment URL
        <input
          v-model="pastedUrl"
          data-testid="scan-url-input"
          placeholder="solana:RECIPIENT?amount=0.001&label=Example"
        />
      </label>
    </div>
    <div class="actions">
      <button type="button" data-testid="validate-payment-url" @click="validatePastedUrl">
        Validate URL
      </button>
    </div>

    <dl v-if="parsedRequest" class="data-grid compact-grid" data-testid="scanner-preview">
      <div>
        <dt>Scan result</dt>
        <dd data-testid="scanner-result">{{ scanResult }}</dd>
      </div>
      <div>
        <dt>Kind</dt>
        <dd data-testid="scanner-kind">
          {{ isTransactionRequest ? "transaction request" : "transfer request" }}
        </dd>
      </div>
      <div v-if="isTransactionRequest">
        <dt>Link</dt>
        <dd data-testid="scanner-link">{{ parsedRequest.link }}</dd>
      </div>
      <div v-else>
        <dt>Recipient</dt>
        <dd data-testid="scanner-recipient">{{ parsedRequest.recipient ?? "Not set" }}</dd>
      </div>
      <div v-if="!isTransactionRequest">
        <dt>Amount</dt>
        <dd data-testid="scanner-amount">{{ amountText }}</dd>
      </div>
      <div v-if="!isTransactionRequest">
        <dt>SPL token mint</dt>
        <dd data-testid="scanner-spl-token">{{ parsedRequest.splToken ?? "native SOL" }}</dd>
      </div>
      <div>
        <dt>Label</dt>
        <dd data-testid="scanner-label">{{ parsedRequest.label ?? "No label" }}</dd>
      </div>
      <div>
        <dt>Message</dt>
        <dd data-testid="scanner-message">{{ parsedRequest.message ?? "No message" }}</dd>
      </div>
      <div v-if="!isTransactionRequest">
        <dt>Memo</dt>
        <dd data-testid="scanner-memo">{{ parsedRequest.memo ?? "No memo" }}</dd>
      </div>
      <div v-if="!isTransactionRequest">
        <dt>References</dt>
        <dd data-testid="scanner-references">
          {{ references.length ? references.join(", ") : "none" }}
        </dd>
      </div>
    </dl>

    <p v-if="scanResult" class="actions">
      <a
        :href="scanResult"
        class="pay-open-link"
        data-testid="scanner-open-wallet"
        rel="noreferrer"
      >
        Open payment request in a wallet
      </a>
    </p>

    <p class="hint">
      Never auto-send a scanned request. Show the recipient, amount, token, and memo, then let the
      user approve the wallet prompt. Settlement is only real once the transaction is confirmed on
      chain under the reference.
    </p>
    <p v-if="scannerError" class="error" data-testid="scanner-error">{{ scannerError }}</p>
  </section>
</template>
