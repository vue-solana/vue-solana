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
  <DemoPanel eyebrow="useSolanaConnection" :title="$t('demo.directConnection.title')">
    <p class="mb-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
      <i18n-t keypath="demo.directConnection.description" tag="span">
        <template #method>
          <code>connection.getLatestBlockhash()</code>
        </template>
      </i18n-t>
    </p>
    <UButton type="button" :loading="loading" color="primary" variant="soft" @click="emit('load')">
      {{ $t("demo.directConnection.load") }}
    </UButton>
    <p
      v-if="blockhash"
      class="mt-4 [overflow-wrap:anywhere] text-sm text-slate-600 dark:text-slate-300"
    >
      <strong class="text-slate-950 dark:text-white">{{
        $t("demo.directConnection.blockhash")
      }}</strong>
      {{ blockhash }}
    </p>
    <UAlert v-if="error" class="mt-4" color="error" variant="subtle" :description="error" />
  </DemoPanel>
</template>
