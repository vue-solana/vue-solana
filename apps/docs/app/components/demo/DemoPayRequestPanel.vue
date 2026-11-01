<script setup lang="ts">
import { computed } from "vue";
import { useDemoSolanaPay } from "~/composables/demo/useDemoSolanaPay";

const {
  amount,
  confirmationError,
  confirmationStatus,
  createDisabledReason,
  createRequest,
  createReady,
  label,
  memo,
  message,
  parsedAmountText,
  parsedRequest,
  payError,
  payLoading,
  payStatus,
  polling,
  qrMarkup,
  recipient,
  reference,
  referenceList,
  requestUrl,
  resetRequest,
  splToken,
  startWatching,
  stopWatching,
  useConnectedWalletAsRecipient,
  verification,
  verifySettlement,
  walletAddress,
} = useDemoSolanaPay();
const { t } = useI18n();

type PanelStatusColor = "neutral" | "success" | "warning" | "error";

const translatedStatus = computed(() => t(`demo.status.${payStatus.value}`, payStatus.value));
const statusColor = computed<PanelStatusColor>(() => {
  if (payStatus.value === "error") {
    return "error";
  }

  if (payStatus.value === "confirmed" || payStatus.value === "finalized") {
    return "success";
  }

  if (payStatus.value === "pending" || payStatus.value === "found") {
    return "warning";
  }

  return "neutral";
});
const disabledReason = computed(() =>
  createDisabledReason.value
    ? t(`demo.solanaPay.request.disabled.${createDisabledReason.value}`)
    : null,
);
const pollingText = computed(() =>
  polling.value
    ? t(`demo.status.${confirmationStatus.value}`, confirmationStatus.value)
    : t("demo.solanaPay.request.fallback.notPolling"),
);
const requestItems = computed(() => [
  {
    label: t("demo.solanaPay.request.labels.requestUrl"),
    value: requestUrl.value ?? t("demo.solanaPay.request.fallback.noRequest"),
  },
  {
    label: t("demo.solanaPay.request.labels.reference"),
    value: reference.value ?? t("demo.solanaPay.request.fallback.noReference"),
  },
  {
    label: t("demo.solanaPay.request.labels.parsedRecipient"),
    value: parsedRequest.value?.recipient ?? t("demo.solanaPay.request.fallback.noRecipient"),
  },
  {
    label: t("demo.solanaPay.request.labels.parsedAmount"),
    value: parsedAmountText.value ?? t("demo.solanaPay.request.fallback.notSet"),
  },
  {
    label: t("demo.solanaPay.request.labels.parsedLabel"),
    value: parsedRequest.value?.label ?? t("demo.solanaPay.request.fallback.noLabel"),
  },
  {
    label: t("demo.solanaPay.request.labels.parsedMemo"),
    value: parsedRequest.value?.memo ?? t("demo.solanaPay.request.fallback.noMemo"),
  },
  {
    label: t("demo.solanaPay.request.labels.referenceCount"),
    value: referenceList.value.length,
  },
  { label: t("demo.solanaPay.request.labels.polling"), value: pollingText.value },
]);
const verificationItems = computed(() => {
  const result = verification.value;

  if (!result) {
    return [];
  }

  return [
    {
      label: t("demo.solanaPay.request.labels.verificationStatus"),
      value: t(`demo.status.${result.status}`, result.status),
    },
    {
      label: t("demo.solanaPay.request.labels.verified"),
      value: result.verified ? t("common.yes") : t("common.no"),
    },
    {
      label: t("demo.solanaPay.request.labels.signature"),
      value: result.signature ?? t("demo.solanaPay.request.fallback.noSignature"),
    },
    {
      label: t("demo.solanaPay.request.labels.reason"),
      value: result.reason ?? t("demo.solanaPay.request.fallback.noReason"),
    },
  ];
});
</script>

<template>
  <DemoPanel
    eyebrow="useSolanaPay + useSolanaQrCode"
    :title="$t('demo.solanaPay.request.title')"
    :status="translatedStatus"
    :status-color="statusColor"
    data-testid="solana-pay-panel"
    wide
  >
    <p class="mb-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
      {{ $t("demo.solanaPay.request.description") }}
    </p>

    <div class="grid gap-3 sm:grid-cols-2">
      <UFormField :label="$t('demo.solanaPay.request.recipient')" class="sm:col-span-2">
        <UInput
          v-model="recipient"
          :placeholder="$t('demo.solanaPay.request.recipientPlaceholder')"
          spellcheck="false"
          class="w-full"
          data-testid="pay-recipient"
        />
      </UFormField>
      <UFormField :label="$t('demo.solanaPay.request.amount')">
        <UInput
          v-model="amount"
          inputmode="decimal"
          placeholder="0.001"
          class="w-full"
          data-testid="pay-amount"
        />
      </UFormField>
      <UFormField :label="$t('demo.solanaPay.request.splToken')">
        <UInput
          v-model="splToken"
          :placeholder="$t('demo.solanaPay.request.splTokenPlaceholder')"
          spellcheck="false"
          class="w-full"
          data-testid="pay-spl-token"
        />
      </UFormField>
      <UFormField :label="$t('demo.solanaPay.request.label')">
        <UInput
          v-model="label"
          :placeholder="$t('demo.solanaPay.request.labelPlaceholder')"
          class="w-full"
          data-testid="pay-label"
        />
      </UFormField>
      <UFormField :label="$t('demo.solanaPay.request.message')">
        <UInput
          v-model="message"
          :placeholder="$t('demo.solanaPay.request.messagePlaceholder')"
          class="w-full"
          data-testid="pay-message"
        />
      </UFormField>
      <UFormField :label="$t('demo.solanaPay.request.memo')" class="sm:col-span-2">
        <UInput
          v-model="memo"
          :placeholder="$t('demo.solanaPay.request.memoPlaceholder')"
          class="w-full"
          data-testid="pay-memo"
        />
      </UFormField>
    </div>

    <div v-if="walletAddress" class="mt-3 flex flex-wrap items-center gap-2">
      <UButton
        type="button"
        color="neutral"
        variant="ghost"
        size="xs"
        @click="useConnectedWalletAsRecipient()"
      >
        {{ $t("demo.solanaPay.request.useConnectedWallet") }}
      </UButton>
    </div>

    <div class="mt-4 flex flex-wrap gap-2">
      <UButton
        type="button"
        :disabled="!createReady"
        :loading="payLoading"
        color="primary"
        data-testid="create-pay-request"
        @click="createRequest()"
      >
        {{
          payLoading ? $t("demo.solanaPay.request.creating") : $t("demo.solanaPay.request.create")
        }}
      </UButton>
      <UButton
        type="button"
        color="neutral"
        variant="soft"
        :disabled="!reference || payLoading"
        data-testid="verify-payment"
        @click="verifySettlement()"
      >
        {{ $t("demo.solanaPay.request.verify") }}
      </UButton>
      <UButton
        type="button"
        color="neutral"
        variant="soft"
        :disabled="!reference"
        data-testid="toggle-payment-watch"
        @click="polling ? stopWatching() : startWatching()"
      >
        {{
          polling ? $t("demo.solanaPay.request.stopWatching") : $t("demo.solanaPay.request.watch")
        }}
      </UButton>
      <UButton
        type="button"
        color="neutral"
        variant="ghost"
        :disabled="!requestUrl"
        data-testid="reset-pay-request"
        @click="resetRequest()"
      >
        {{ $t("demo.solanaPay.request.reset") }}
      </UButton>
    </div>

    <UAlert
      v-if="disabledReason"
      class="mt-4"
      color="warning"
      variant="subtle"
      :description="disabledReason"
      data-testid="pay-disabled-reason"
    />

    <DemoDataGrid class="mt-4" compact :items="requestItems" />

    <div
      v-if="qrMarkup"
      class="mx-auto mt-4 w-fit rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700"
      data-testid="pay-qr"
      v-html="qrMarkup"
    />

    <DemoDataGrid
      v-if="verificationItems.length"
      class="mt-4"
      compact
      :items="verificationItems"
      data-testid="pay-verification"
    />

    <p class="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
      {{ $t("demo.solanaPay.request.hint") }}
    </p>

    <UAlert
      v-if="payError"
      class="mt-3"
      color="error"
      variant="subtle"
      :title="payError"
      data-testid="pay-error"
    />
    <UAlert
      v-if="confirmationError"
      class="mt-3"
      color="error"
      variant="subtle"
      :title="confirmationError"
      data-testid="pay-polling-error"
    />
  </DemoPanel>
</template>
