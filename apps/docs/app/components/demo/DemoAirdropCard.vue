<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  error?: string | null;
  loading: boolean;
  signature?: string | null;
  status: string;
  payerReady: boolean;
}>();

const emit = defineEmits<{
  airdrop: [];
}>();

const { t } = useI18n();
const translatedStatus = computed(() => t(`demo.status.${props.status}`, props.status));
const statusColor = computed(() => {
  if (props.status === "error") {
    return "error" as const;
  }

  if (props.status === "success") {
    return "success" as const;
  }

  if (props.status === "running") {
    return "warning" as const;
  }

  return "neutral" as const;
});
</script>

<template>
  <DemoPanel
    eyebrow="useSolanaAirdrop"
    :title="$t('demo.airdrop.title')"
    :status="translatedStatus"
    :status-color="statusColor"
  >
    <p class="text-sm leading-6 text-slate-600 dark:text-slate-300">
      {{ $t("demo.airdrop.description") }}
    </p>

    <UButton
      color="primary"
      variant="soft"
      size="sm"
      class="mt-4"
      :disabled="!payerReady"
      :loading="loading"
      @click="emit('airdrop')"
    >
      {{ $t("demo.airdrop.request") }}
    </UButton>

    <p v-if="!payerReady" class="mt-3 text-sm text-slate-500 dark:text-slate-400">
      {{ $t("demo.airdrop.connectHint") }}
    </p>

    <p class="mt-3 text-sm font-bold [overflow-wrap:anywhere] text-slate-950 dark:text-white">
      {{ signature ? $t("demo.airdrop.signature", { signature }) : $t("demo.airdrop.noSignature") }}
    </p>

    <UAlert v-if="error" color="error" variant="subtle" class="mt-3" :title="error" />
  </DemoPanel>
</template>
