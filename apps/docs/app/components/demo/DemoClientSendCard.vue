<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  batchError?: string | null;
  batchLoading: boolean;
  batchStatus: string;
  batchText?: string | null;
  loading: boolean;
  payerAddress?: string | null;
  payerReady: boolean;
  singleError?: string | null;
  singleStatus: string;
  singleText?: string | null;
}>();

const emit = defineEmits<{
  sendBatch: [];
  sendSingle: [];
}>();

const { t } = useI18n();
const translatedSingleStatus = computed(() =>
  t(`demo.status.${props.singleStatus}`, props.singleStatus),
);
const translatedBatchStatus = computed(() =>
  t(`demo.status.${props.batchStatus}`, props.batchStatus),
);
const sendsDisabled = computed(() => !props.payerReady || props.loading || props.batchLoading);

function statusColor(status: string) {
  if (status === "error") {
    return "error" as const;
  }

  if (status === "sent") {
    return "success" as const;
  }

  if (status === "sending") {
    return "warning" as const;
  }

  return "neutral" as const;
}
</script>

<template>
  <DemoPanel eyebrow="useSolanaSendTransaction(s)" :title="$t('demo.clientSend.title')">
    <p class="text-sm leading-6 text-slate-600 dark:text-slate-300">
      {{ $t("demo.clientSend.description") }}
    </p>

    <p
      class="mt-3 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-bold leading-6 text-violet-900 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200"
      data-testid="client-send-when-to-use"
    >
      {{ $t("demo.clientSend.whenToUse") }}
    </p>

    <p class="mt-3 text-sm text-slate-600 dark:text-slate-300">
      <span class="font-bold">{{ $t("demo.clientSend.payer") }}:</span>
      <span v-if="payerAddress" class="wrap-anywhere">{{ payerAddress }}</span>
      <span v-else class="italic">{{ $t("demo.clientSend.noPayer") }}</span>
    </p>

    <UAlert
      v-if="!payerReady"
      color="warning"
      variant="subtle"
      class="mt-3"
      :title="$t('demo.clientSend.payerHint')"
    />

    <div class="mt-4 grid gap-4">
      <div class="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm font-bold text-slate-950 dark:text-white">
            {{ $t("demo.clientSend.single") }}
          </p>
          <UBadge
            :color="statusColor(singleStatus)"
            variant="subtle"
            class="uppercase"
            role="status"
            aria-live="polite"
          >
            {{ translatedSingleStatus }}
          </UBadge>
        </div>
        <UButton
          color="primary"
          variant="soft"
          size="sm"
          class="mt-3"
          :disabled="sendsDisabled"
          :loading="loading"
          @click="emit('sendSingle')"
        >
          {{ $t("demo.clientSend.sendSingle") }}
        </UButton>
        <p class="mt-3 text-sm wrap-anywhere text-slate-600 dark:text-slate-300" aria-live="polite">
          {{ singleText ?? $t("demo.clientSend.noSend") }}
        </p>
        <UAlert
          v-if="singleError"
          color="error"
          variant="subtle"
          class="mt-3"
          :title="singleError"
          role="alert"
          data-testid="client-send-single-error"
        />
      </div>

      <div class="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm font-bold text-slate-950 dark:text-white">
            {{ $t("demo.clientSend.batch") }}
          </p>
          <UBadge
            :color="statusColor(batchStatus)"
            variant="subtle"
            class="uppercase"
            role="status"
            aria-live="polite"
          >
            {{ translatedBatchStatus }}
          </UBadge>
        </div>
        <UButton
          color="primary"
          variant="soft"
          size="sm"
          class="mt-3"
          :disabled="sendsDisabled"
          :loading="batchLoading"
          @click="emit('sendBatch')"
        >
          {{ $t("demo.clientSend.sendBatch") }}
        </UButton>
        <p class="mt-3 text-sm wrap-anywhere text-slate-600 dark:text-slate-300" aria-live="polite">
          {{ batchText ?? $t("demo.clientSend.noSend") }}
        </p>
        <UAlert
          v-if="batchError"
          color="error"
          variant="subtle"
          class="mt-3"
          :title="batchError"
          role="alert"
          data-testid="client-send-batch-error"
        />
      </div>
    </div>
  </DemoPanel>
</template>
