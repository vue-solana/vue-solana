<script setup lang="ts">
const message = defineModel<string>("message", { required: true });

const props = defineProps<{
  canSignMessage: boolean;
  disabledReason?: string | null;
  error?: string | null;
  loading: boolean;
  ready: boolean;
  signature?: string | null;
  signedMessage?: string | null;
  status: string;
  statusColor: "neutral" | "primary" | "secondary" | "success" | "info" | "warning" | "error";
  walletReady: boolean;
}>();

const emit = defineEmits<{
  sign: [];
}>();

const { t } = useI18n();
const translatedStatus = computed(() => t(`demo.status.${props.status}`, props.status));
</script>

<template>
  <DemoPanel
    eyebrow="useSolanaSignMessage"
    :title="$t('demo.messageSigning.title')"
    :status="translatedStatus"
    :status-color="statusColor"
    data-testid="message-signing-panel"
  >
    <p class="mb-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
      {{ $t("demo.messageSigning.description") }}
    </p>

    <dl class="mb-4 grid gap-3 sm:grid-cols-2">
      <div
        class="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/90 p-3 dark:border-slate-700 dark:bg-slate-950/45"
      >
        <dt class="text-xs font-medium text-slate-500 dark:text-slate-400">
          {{ $t("demo.messageSigning.walletReady") }}
        </dt>
        <dd
          class="mt-1 [overflow-wrap:anywhere] text-sm font-bold text-slate-950 dark:text-white"
          data-testid="message-wallet-ready"
        >
          {{ walletReady ? $t("common.yes") : $t("common.no") }}
        </dd>
      </div>
      <div
        class="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/90 p-3 dark:border-slate-700 dark:bg-slate-950/45"
      >
        <dt class="text-xs font-medium text-slate-500 dark:text-slate-400">
          {{ $t("demo.messageSigning.capability") }}
        </dt>
        <dd
          class="mt-1 [overflow-wrap:anywhere] text-sm font-bold text-slate-950 dark:text-white"
          data-testid="message-capability"
        >
          {{ canSignMessage ? $t("common.yes") : $t("common.no") }}
        </dd>
      </div>
    </dl>

    <div class="grid gap-3">
      <UFormField :label="$t('demo.messageSigning.messageLabel')">
        <UTextarea
          v-model="message"
          class="w-full"
          :rows="3"
          data-testid="message-to-sign"
          :placeholder="$t('demo.messageSigning.messagePlaceholder')"
        />
      </UFormField>
    </div>

    <div class="mt-4 flex flex-wrap gap-2">
      <UButton
        type="button"
        :disabled="!ready"
        :loading="loading"
        color="primary"
        data-testid="sign-message"
        @click="emit('sign')"
      >
        {{ $t("demo.messageSigning.sign") }}
      </UButton>
    </div>

    <UAlert
      v-if="disabledReason"
      class="mt-4"
      color="warning"
      variant="subtle"
      :description="disabledReason"
      data-testid="message-disabled-reason"
    />
    <p class="mt-4 [overflow-wrap:anywhere] text-sm text-slate-600 dark:text-slate-300">
      <strong class="text-slate-950 dark:text-white">{{
        $t("demo.messageSigning.signature")
      }}</strong>
      <span data-testid="message-signature">{{
        signature ?? $t("demo.fallback.noSignature")
      }}</span>
    </p>
    <p
      v-if="signedMessage"
      class="mt-2 [overflow-wrap:anywhere] text-sm text-slate-600 dark:text-slate-300"
      data-testid="signed-message"
    >
      <strong class="text-slate-950 dark:text-white">{{
        $t("demo.messageSigning.signedMessage")
      }}</strong>
      {{ signedMessage }}
    </p>
    <UAlert v-if="error" class="mt-4" color="error" variant="subtle" :description="error" />
  </DemoPanel>
</template>
