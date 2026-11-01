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

    <video
      v-show="scanning"
      ref="video"
      class="mt-4 w-full max-w-sm rounded-2xl border border-slate-200 bg-slate-950 dark:border-slate-700"
      playsinline
      muted
    />

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
