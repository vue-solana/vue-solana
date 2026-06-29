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
  <DemoPanel eyebrow="useSolanaBalance" title="Balance Lookup">
    <UFormField label="Public key">
      <UInput v-model="address" placeholder="Enter a Solana public key" class="w-full" />
    </UFormField>

    <div class="mt-4 flex flex-wrap gap-2">
      <UButton
        type="button"
        :loading="loading"
        color="primary"
        variant="soft"
        @click="emit('refresh')"
      >
        Refresh Balance
      </UButton>
    </div>

    <div class="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
      <p>
        <strong class="text-slate-950 dark:text-white">Lamports:</strong>
        {{ lamports ?? "No balance loaded" }}
      </p>
      <p><strong class="text-slate-950 dark:text-white">SOL:</strong> {{ solBalance }}</p>
    </div>
    <UAlert v-if="error" class="mt-4" color="error" variant="subtle" :description="error" />
  </DemoPanel>
</template>
