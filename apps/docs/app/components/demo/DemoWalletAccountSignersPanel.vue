<script setup lang="ts">
const message = defineModel<string>("message", { required: true });

const props = defineProps<{
  disabledReason?: string | null;
  error?: string | null;
  ready: boolean;
  signing: boolean;
  signature?: string | null;
  signedMessage?: string | null;
  signerAddress?: string | null;
  transactionSignerAddress?: string | null;
  sendingSignerAddress?: string | null;
  chain: string;
  status: string;
  statusColor: "neutral" | "primary" | "secondary" | "success" | "info" | "warning" | "error";
}>();

const emit = defineEmits<{
  sign: [];
}>();

const { t } = useI18n();
const translatedStatus = computed(() => t(`demo.status.${props.status}`, props.status));
</script>

<template>
  <DemoPanel
    eyebrow="useSolanaWalletAccount*Signer"
    :title="$t('demo.walletAccountSigners.title')"
    :status="translatedStatus"
    :status-color="statusColor"
    data-testid="wallet-account-signers-panel"
  >
    <p class="mb-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
      {{ $t("demo.walletAccountSigners.description") }}
    </p>

    <dl class="mb-4 grid gap-3 sm:grid-cols-2">
      <div
        class="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/90 p-3 dark:border-slate-700 dark:bg-slate-950/45"
      >
        <dt class="text-xs font-medium text-slate-500 dark:text-slate-400">
          {{ $t("demo.walletAccountSigners.signerAddress") }}
        </dt>
        <dd
          class="mt-1 [overflow-wrap:anywhere] text-sm font-bold text-slate-950 dark:text-white"
          data-testid="kit-signer-address"
        >
          {{ signerAddress ?? $t("demo.fallback.notConnected") }}
        </dd>
      </div>
      <div
        class="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/90 p-3 dark:border-slate-700 dark:bg-slate-950/45"
      >
        <dt class="text-xs font-medium text-slate-500 dark:text-slate-400">
          {{ $t("demo.walletAccountSigners.chain") }}
        </dt>
        <dd
          class="mt-1 [overflow-wrap:anywhere] text-sm font-bold text-slate-950 dark:text-white"
          data-testid="kit-signer-chain"
        >
          {{ chain }}
        </dd>
      </div>
      <div
        class="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/90 p-3 dark:border-slate-700 dark:bg-slate-950/45"
      >
        <dt class="text-xs font-medium text-slate-500 dark:text-slate-400">
          TransactionModifyingSigner
        </dt>
        <dd
          class="mt-1 [overflow-wrap:anywhere] text-sm font-bold text-slate-950 dark:text-white"
          data-testid="kit-transaction-signer-address"
        >
          {{ transactionSignerAddress ?? $t("demo.fallback.notConnected") }}
        </dd>
      </div>
      <div
        class="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/90 p-3 dark:border-slate-700 dark:bg-slate-950/45"
      >
        <dt class="text-xs font-medium text-slate-500 dark:text-slate-400">
          TransactionSendingSigner
        </dt>
        <dd
          class="mt-1 [overflow-wrap:anywhere] text-sm font-bold text-slate-950 dark:text-white"
          data-testid="kit-sending-signer-address"
        >
          {{ sendingSignerAddress ?? $t("demo.fallback.notConnected") }}
        </dd>
      </div>
    </dl>

    <div class="grid gap-3">
      <UFormField :label="$t('demo.walletAccountSigners.messageLabel')">
        <UTextarea
          v-model="message"
          class="w-full"
          :rows="3"
          data-testid="kit-signer-message"
          :placeholder="$t('demo.walletAccountSigners.messagePlaceholder')"
        />
      </UFormField>
    </div>

    <div class="mt-4 flex flex-wrap gap-2">
      <UButton
        type="button"
        :disabled="!ready || signing"
        :loading="signing"
        color="primary"
        data-testid="kit-signer-sign"
        @click="emit('sign')"
      >
        {{ $t("demo.walletAccountSigners.sign") }}
      </UButton>
    </div>

    <UAlert
      v-if="disabledReason"
      class="mt-4"
      color="warning"
      variant="subtle"
      :description="disabledReason"
      data-testid="kit-signer-disabled-reason"
    />
    <p class="mt-4 [overflow-wrap:anywhere] text-sm text-slate-600 dark:text-slate-300">
      <strong class="text-slate-950 dark:text-white">{{
        $t("demo.walletAccountSigners.signature")
      }}</strong>
      <span data-testid="kit-signer-signature">{{
        signature ?? $t("demo.fallback.noSignature")
      }}</span>
    </p>
    <p
      v-if="signedMessage"
      class="mt-2 [overflow-wrap:anywhere] text-sm text-slate-600 dark:text-slate-300"
      data-testid="kit-signer-signed-message"
    >
      <strong class="text-slate-950 dark:text-white">{{
        $t("demo.walletAccountSigners.signedMessage")
      }}</strong>
      {{ signedMessage }}
    </p>
    <UAlert v-if="error" class="mt-4" color="error" variant="subtle" :description="error" />
  </DemoPanel>
</template>
