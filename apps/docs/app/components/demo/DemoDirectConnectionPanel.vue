<script setup lang="ts">
defineProps<{
  blockhash?: string | null;
  error?: string | null;
  loading: boolean;
}>();

const emit = defineEmits<{
  load: [];
}>();
</script>

<template>
  <DemoPanel eyebrow="useSolanaConnection" title="Direct Connection Call">
    <p class="mb-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
      Calls <code>connection.getLatestBlockhash()</code> directly from the injected connection.
    </p>
    <UButton type="button" :loading="loading" color="primary" variant="soft" @click="emit('load')">
      Load Blockhash
    </UButton>
    <p
      v-if="blockhash"
      class="mt-4 [overflow-wrap:anywhere] text-sm text-slate-600 dark:text-slate-300"
    >
      <strong class="text-slate-950 dark:text-white">Blockhash:</strong> {{ blockhash }}
    </p>
    <UAlert v-if="error" class="mt-4" color="error" variant="subtle" :description="error" />
  </DemoPanel>
</template>
