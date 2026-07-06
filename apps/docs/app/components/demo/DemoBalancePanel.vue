<script setup lang="ts">
const address = defineModel<string>("address", { required: true });

defineProps<{
  error?: string | null;
  loading: boolean;
  lamports?: number | null;
  solBalance: string;
}>();

const emit = defineEmits<{
  refresh: [];
}>();
</script>

<template>
  <DemoPanel eyebrow="useSolanaBalance" :title="$t('demo.balance.title')">
    <UFormField :label="$t('demo.balance.publicKey')">
      <UInput
        v-model="address"
        :placeholder="$t('demo.balance.publicKeyPlaceholder')"
        class="w-full"
      />
    </UFormField>

    <div class="mt-4 flex flex-wrap gap-2">
      <UButton
        type="button"
        :loading="loading"
        color="primary"
        variant="soft"
        @click="emit('refresh')"
      >
        {{ $t("demo.balance.refresh") }}
      </UButton>
    </div>

    <div class="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
      <p>
        <strong class="text-slate-950 dark:text-white">{{ $t("demo.balance.lamports") }}</strong>
        {{ lamports ?? $t("demo.fallback.noBalance") }}
      </p>
      <p>
        <strong class="text-slate-950 dark:text-white">{{ $t("demo.balance.sol") }}</strong>
        {{ solBalance }}
      </p>
    </div>
    <UAlert v-if="error" class="mt-4" color="error" variant="subtle" :description="error" />
  </DemoPanel>
</template>
