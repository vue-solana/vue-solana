<script setup lang="ts">
import { computed, ref } from "vue";
import { useDemoSolanaPayScanner } from "~/composables/demo/useDemoSolanaPayScanner";

const {
  amountText,
  barcodeDetectorSupported,
  cameraSupported,
  isTransactionRequest,
  parsedRequest,
  pastedUrl,
  payDisabledReason,
  payLoading,
  payReady,
  payScannedRequest,
  paymentError,
  paymentExplorerUrl,
  paymentSignature,
  references,
  resetScan,
  scanResult,
  scanning,
  scannerError,
  startScanner,
  stopScanner,
  validatePastedUrl,
} = useDemoSolanaPayScanner();
const { t } = useI18n();

const video = ref<HTMLVideoElement | null>(null);
const translatedStatus = computed(() => t(`demo.status.${scanning.value ? "scanning" : "idle"}`));
const previewItems = computed(() => {
  const parsed = parsedRequest.value;

  if (!parsed) {
    return [];
  }

  const items: Array<{ label: string; value: unknown }> = [
    {
      label: t("demo.solanaPay.scanner.labels.kind"),
      value: isTransactionRequest.value
        ? t("demo.solanaPay.scanner.values.transactionRequest")
        : t("demo.solanaPay.scanner.values.transferRequest"),
    },
  ];

  if (scanResult.value) {
    items.unshift({
      label: t("demo.solanaPay.scanner.labels.scanResult"),
      value: scanResult.value,
    });
  }

  if (isTransactionRequest.value) {
    items.push({ label: t("demo.solanaPay.scanner.labels.link"), value: parsed.link });
  } else {
    items.push(
      {
        label: t("demo.solanaPay.scanner.labels.recipient"),
        value: parsed.recipient ?? t("demo.solanaPay.scanner.fallback.notSet"),
      },
      {
        label: t("demo.solanaPay.scanner.labels.amount"),
        value: amountText.value ?? t("demo.solanaPay.scanner.fallback.notSet"),
      },
      {
        label: t("demo.solanaPay.scanner.labels.splToken"),
        value: parsed.splToken ?? t("demo.solanaPay.scanner.values.nativeSol"),
      },
    );
  }

  items.push(
    {
      label: t("demo.solanaPay.scanner.labels.label"),
      value: parsed.label ?? t("demo.solanaPay.scanner.fallback.noLabel"),
    },
    {
      label: t("demo.solanaPay.scanner.labels.message"),
      value: parsed.message ?? t("demo.solanaPay.scanner.fallback.noMessage"),
    },
  );

  if (!isTransactionRequest.value) {
    items.push(
      {
        label: t("demo.solanaPay.scanner.labels.memo"),
        value: parsed.memo ?? t("demo.solanaPay.scanner.fallback.noMemo"),
      },
      {
        label: t("demo.solanaPay.scanner.labels.references"),
        value: references.value.length
          ? references.value.join(", ")
          : t("demo.solanaPay.scanner.values.none"),
      },
    );
  }

  return items;
});

function startScan() {
  return startScanner(video.value);
}
</script>

<template>
  <DemoPanel
    eyebrow="useSolanaQrScanner"
    :title="$t('demo.solanaPay.scanner.title')"
    :status="translatedStatus"
    :status-color="scanning ? 'warning' : 'neutral'"
    data-testid="solana-pay-scanner-panel"
    wide
  >
    <p class="mb-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
      {{ $t("demo.solanaPay.scanner.description") }}
    </p>

    <div class="flex flex-wrap gap-2">
      <UButton
        type="button"
        color="primary"
        :disabled="scanning"
        data-testid="start-scanner"
        @click="startScan()"
      >
        {{ $t("demo.solanaPay.scanner.start") }}
      </UButton>
      <UButton
        type="button"
        color="neutral"
        variant="soft"
        :disabled="!scanning"
        data-testid="stop-scanner"
        @click="stopScanner()"
      >
        {{ $t("demo.solanaPay.scanner.stop") }}
      </UButton>
      <UButton
        type="button"
        color="neutral"
        variant="ghost"
        data-testid="reset-scan"
        @click="resetScan()"
      >
        {{ $t("demo.solanaPay.scanner.reset") }}
      </UButton>
    </div>

    <div
      v-show="scanning"
      class="relative mt-4 aspect-square w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 dark:border-slate-700"
      data-testid="scanner-viewport"
    >
      <video ref="video" class="absolute inset-0 size-full object-cover" playsinline muted />
      <div class="scanner-frame" aria-hidden="true">
        <span class="scanner-line" />
      </div>
    </div>

    <UAlert
      v-if="!cameraSupported"
      class="mt-3"
      color="warning"
      variant="subtle"
      :description="$t('demo.solanaPay.scanner.cameraUnsupported')"
      data-testid="scanner-camera-unsupported"
    />
    <UAlert
      v-else-if="!barcodeDetectorSupported"
      class="mt-3"
      color="warning"
      variant="subtle"
      :description="$t('demo.solanaPay.scanner.barcodeUnsupported')"
      data-testid="scanner-barcode-unsupported"
    />

    <div class="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
      <UFormField :label="$t('demo.solanaPay.scanner.urlLabel')">
        <UInput
          v-model="pastedUrl"
          :placeholder="$t('demo.solanaPay.scanner.urlPlaceholder')"
          spellcheck="false"
          class="w-full"
          data-testid="scan-url-input"
        />
      </UFormField>
      <UButton
        type="button"
        color="neutral"
        variant="soft"
        data-testid="validate-payment-url"
        @click="validatePastedUrl()"
      >
        {{ $t("demo.solanaPay.scanner.validate") }}
      </UButton>
    </div>

    <DemoDataGrid
      v-if="previewItems.length"
      class="mt-4"
      compact
      :items="previewItems"
      data-testid="scanner-preview"
    />

    <div v-if="parsedRequest" class="mt-4" data-testid="scanner-pay">
      <UButton
        type="button"
        color="primary"
        :disabled="!payReady"
        :loading="payLoading"
        data-testid="scanner-pay-button"
        @click="payScannedRequest()"
      >
        {{ $t("demo.solanaPay.scanner.pay") }}
      </UButton>
      <p
        v-if="payDisabledReason"
        class="mt-2 text-sm text-slate-600 dark:text-slate-300"
        data-testid="scanner-pay-disabled"
      >
        {{ $t(`demo.solanaPay.scanner.payDisabled.${payDisabledReason}`) }}
      </p>
      <p v-if="paymentSignature" class="mt-2 text-sm" data-testid="scanner-pay-signature">
        {{ $t("demo.solanaPay.scanner.paid") }}
        <a
          v-if="paymentExplorerUrl"
          :href="paymentExplorerUrl"
          class="font-bold text-violet-700 hover:underline dark:text-violet-300"
          target="_blank"
          rel="noreferrer"
        >
          {{ $t("demo.solanaPay.scanner.viewPayment") }}
        </a>
      </p>
      <UAlert
        v-if="paymentError"
        class="mt-3"
        color="error"
        variant="subtle"
        :title="paymentError"
        data-testid="scanner-pay-error"
      />
    </div>

    <p v-if="scanResult" class="mt-3">
      <a
        :href="scanResult"
        class="text-sm font-bold text-violet-700 hover:underline dark:text-violet-300"
        data-testid="scanner-open-wallet"
        rel="noreferrer"
      >
        {{ $t("demo.solanaPay.scanner.openInWallet") }}
      </a>
    </p>

    <p class="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
      {{ $t("demo.solanaPay.scanner.hint") }}
    </p>

    <UAlert
      v-if="scannerError"
      class="mt-3"
      color="error"
      variant="subtle"
      :title="scannerError"
      data-testid="scanner-error"
    />
  </DemoPanel>
</template>

<style scoped>
/* Corner brackets around the area the decoder reads, plus a sweeping line. */
.scanner-frame {
  position: absolute;
  inset: 12%;
  background:
    linear-gradient(white, white) top left / 28px 3px,
    linear-gradient(white, white) top left / 3px 28px,
    linear-gradient(white, white) top right / 28px 3px,
    linear-gradient(white, white) top right / 3px 28px,
    linear-gradient(white, white) bottom left / 28px 3px,
    linear-gradient(white, white) bottom left / 3px 28px,
    linear-gradient(white, white) bottom right / 28px 3px,
    linear-gradient(white, white) bottom right / 3px 28px;
  background-repeat: no-repeat;
  filter: drop-shadow(0 0 2px rgb(0 0 0 / 0.6));
}

.scanner-line {
  position: absolute;
  inset-inline: 4%;
  top: 0;
  height: 2px;
  border-radius: 9999px;
  background: rgb(167 139 250);
  box-shadow: 0 0 12px 2px rgb(139 92 246 / 0.8);
  animation: scanner-sweep 2.2s ease-in-out infinite alternate;
}

@keyframes scanner-sweep {
  from {
    top: 2%;
  }
  to {
    top: 98%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .scanner-line {
    animation: none;
    top: 50%;
  }
}
</style>
