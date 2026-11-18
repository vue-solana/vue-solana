<script setup lang="ts">
defineProps<{
  balanceChangesCount?: number | null;
  data?: {
    err: unknown;
    fee?: bigint | number | null;
    unitsConsumed?: bigint | number | null;
  } | null;
  errText?: string | null;
  error?: string | null;
  loading: boolean;
  logsCount?: number | null;
  status: string;
}>();

const emit = defineEmits<{
  run: [];
}>();
</script>

<template>
  <DemoPanel
    eyebrow="useSolanaSimulateTransaction"
    :title="$t('demo.simulateTransaction.title')"
    :status="$t(`demo.status.${status}`, status)"
    :status-color="status === 'error' ? 'error' : status === 'simulated' ? 'success' : 'neutral'"
  >
    <p class="mb-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
      {{ $t("demo.simulateTransaction.description") }}
    </p>

    <DemoDataGrid
      compact
      :items="[
        {
          label: $t('demo.simulateTransaction.labels.err'),
          value: errText ?? $t('demo.simulateTransaction.notRun'),
        },
        {
          label: $t('demo.simulateTransaction.labels.fee'),
          value:
            data?.fee != null
              ? `${data.fee} ${$t('demo.simulateTransaction.lamports')}`
              : $t('demo.simulateTransaction.notRun'),
        },
        {
          label: $t('demo.simulateTransaction.labels.units'),
          value:
            data?.unitsConsumed != null
              ? String(data.unitsConsumed)
              : $t('demo.simulateTransaction.notRun'),
        },
        {
          label: $t('demo.simulateTransaction.labels.logs'),
          value: logsCount != null ? String(logsCount) : $t('demo.simulateTransaction.notRun'),
        },
        {
          label: $t('demo.simulateTransaction.labels.balanceChanges'),
          value:
            balanceChangesCount != null
              ? String(balanceChangesCount)
              : $t('demo.simulateTransaction.notRun'),
        },
      ]"
    />

    <UButton type="button" :loading="loading" color="primary" variant="soft" @click="emit('run')">
      {{ $t("demo.simulateTransaction.run") }}
    </UButton>

    <UAlert v-if="error" class="mt-4" color="error" variant="subtle" :description="error" />
  </DemoPanel>
</template>
