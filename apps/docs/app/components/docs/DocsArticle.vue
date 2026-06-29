<script setup lang="ts">
defineProps<{
  page: Record<string, unknown>;
}>();
</script>

<template>
  <UCard
    variant="subtle"
    class="hide-scrollbar min-w-0 border-slate-200/80 bg-white/90 shadow-xl shadow-slate-900/5 backdrop-blur lg:min-h-0 lg:overflow-y-auto dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-black/20"
    :ui="{ body: 'p-6 sm:p-8 lg:p-10' }"
  >
    <article class="docs-content">
      <ContentRenderer :value="page" />
    </article>
  </UCard>
</template>
