<script setup lang="ts">
const recipient = defineModel<string>("recipient", { required: true });
const amount = defineModel<string>("amount", { required: true });

const props = defineProps<{
  confirmationState: string;
  disabledReason?: string | null;
  error?: string | null;
  explorerUrl?: string | null;
  loading: boolean;
  ready: boolean;
  signature?: string | null;
  status: string;
  statusText: string;
  walletReady: boolean;
}>();

const emit = defineEmits<{
  send: [];
}>();

const { t } = useI18n();
const translatedStatus = computed(() => t(`demo.status.${props.statusText}`, props.statusText));
const translatedConfirmationState = computed(() =>
  t(`demo.status.${props.confirmationState}`, props.confirmationState),
);
</script>

<template>
  <DemoPanel
    eyebrow="useSolanaSignAndSendTransaction"
    :title="$t('demo.transfer.title')"
    :status="translatedStatus"
    :status-color="status === 'error' ? 'error' : walletReady ? 'success' : 'neutral'"
    wide
  >
    <p class="mb-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
      <i18n-t keypath="demo.transfer.description" tag="span">
        <template #amount>
          <code>0.000001</code>
        </template>
      </i18n-t>
    </p>

    <DemoDataGrid
      compact
      :items="[
        {
          label: $t('demo.transfer.labels.walletReady'),
          value: walletReady ? $t('common.yes') : $t('common.no'),
        },
        {
          label: $t('demo.transfer.labels.submittedSignature'),
          value: signature ?? $t('demo.fallback.noSignature'),
        },
        { label: $t('demo.transfer.labels.confirmationState'), value: translatedConfirmationState },
      ]"
    />

    <div class="grid gap-3">
      <UFormField :label="$t('demo.transfer.recipient')">
        <UInput
          v-model="recipient"
          :placeholder="$t('demo.transfer.recipientPlaceholder')"
          class="w-full"
        />
      </UFormField>
      <UFormField :label="$t('demo.transfer.amount')">
        <UInput v-model="amount" inputmode="decimal" placeholder="0.000001" class="w-full" />
      </UFormField>
    </div>

    <div class="mt-4 flex flex-wrap gap-2">
      <UButton
        type="button"
        :disabled="!ready"
        :loading="loading"
        color="primary"
        @click="emit('send')"
      >
        {{ $t("demo.transfer.send") }}
      </UButton>
    </div>

    <UAlert
      v-if="disabledReason"
      class="mt-4"
      color="warning"
      variant="subtle"
      :description="disabledReason"
    />
    <p
      class="mt-4 [overflow-wrap:anywhere] text-sm text-slate-600 dark:text-slate-300"
      data-testid="transfer-signature"
    >
      <strong class="text-slate-950 dark:text-white">{{ $t("demo.transfer.signature") }}</strong>
      {{ signature ?? $t("demo.fallback.noSignature") }}
    </p>
    <p
      v-if="explorerUrl"
      class="mt-2 text-sm text-slate-600 dark:text-slate-300"
      data-testid="transfer-explorer-link"
    >
      <strong class="text-slate-950 dark:text-white">{{ $t("demo.transfer.explorer") }}</strong>
      <NuxtLink
        :to="explorerUrl"
        target="_blank"
        rel="noreferrer"
        class="font-bold text-violet-700 hover:underline dark:text-violet-300"
      >
        {{ $t("demo.transfer.viewTransaction") }}
      </NuxtLink>
    </p>
    <UAlert v-if="error" class="mt-4" color="error" variant="subtle" :description="error" />
  </DemoPanel>
</template>
