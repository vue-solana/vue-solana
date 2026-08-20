<script setup lang="ts">
defineProps<{
  accountCount: number;
  loading: boolean;
  error?: string | null;
  mintAddress: string;
  mintReady: boolean;
  balanceLoading: boolean;
  balanceDisplay: string;
  balanceError?: string | null;
}>();

const emit = defineEmits<{
  "update:mintAddress": [value: string];
  refreshAccounts: [];
  refreshBalance: [];
}>();
</script>

<template>
  <DemoPanel eyebrow="useSolanaTokenAccounts" :title="$t('demo.tokenAccounts.title')">
    <p class="mb-4 text-sm text-slate-600 dark:text-slate-300">
      {{ $t("demo.tokenAccounts.description") }}
    </p>

    <div class="mb-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
      <p>
        <strong class="text-slate-950 dark:text-white">{{
          $t("demo.tokenAccounts.labels.accounts")
        }}</strong>
        {{ loading ? $t("demo.status.loading") : accountCount }}
      </p>
    </div>

    <div class="flex flex-wrap gap-2">
      <UButton
        type="button"
        :loading="loading"
        color="primary"
        variant="soft"
        @click="emit('refreshAccounts')"
      >
        {{ $t("demo.tokenAccounts.refresh") }}
      </UButton>
    </div>

    <UAlert v-if="error" class="mt-4" color="error" variant="subtle" :description="error" />

    <UDivider class="my-4" />

    <p
      class="mb-2 text-xs font-black uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300"
    >
      useSolanaTokenBalance
    </p>

    <UFormField :label="$t('demo.tokenAccounts.mintLabel')">
      <UInput
        :model-value="mintAddress"
        :placeholder="$t('demo.tokenAccounts.mintPlaceholder')"
        class="w-full"
        @update:model-value="emit('update:mintAddress', $event)"
      />
    </UFormField>

    <div class="mt-4 flex flex-wrap gap-2">
      <UButton
        type="button"
        :loading="balanceLoading"
        :disabled="!mintReady"
        color="primary"
        variant="soft"
        @click="emit('refreshBalance')"
      >
        {{ $t("demo.tokenAccounts.refreshBalance") }}
      </UButton>
    </div>

    <div class="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
      <p>
        <strong class="text-slate-950 dark:text-white">{{
          $t("demo.tokenAccounts.labels.balance")
        }}</strong>
        {{ balanceDisplay }}
      </p>
    </div>

    <UAlert
      v-if="balanceError"
      class="mt-4"
      color="error"
      variant="subtle"
      :description="balanceError"
    />
  </DemoPanel>
</template>
