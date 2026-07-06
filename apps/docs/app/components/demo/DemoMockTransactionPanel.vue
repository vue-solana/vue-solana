<script setup lang="ts">
defineProps<{
  error?: string | null;
  loading: boolean;
  signature?: string | null;
}>();

const emit = defineEmits<{
  run: [];
}>();
</script>

<template>
  <DemoPanel eyebrow="useTransaction" :title="$t('demo.mockTransaction.title')">
    <p class="mb-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
      {{ $t("demo.mockTransaction.description") }}
    </p>
    <UButton type="button" :loading="loading" color="primary" variant="soft" @click="emit('run')">
      {{ $t("demo.mockTransaction.run") }}
    </UButton>
    <p class="mt-4 [overflow-wrap:anywhere] text-sm text-slate-600 dark:text-slate-300">
      <strong class="text-slate-950 dark:text-white">{{
        $t("demo.mockTransaction.signature")
      }}</strong>
      {{ signature ?? $t("demo.fallback.noSignature") }}
    </p>
    <UAlert v-if="error" class="mt-4" color="error" variant="subtle" :description="error" />
  </DemoPanel>
</template>
