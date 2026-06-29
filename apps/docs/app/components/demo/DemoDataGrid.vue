<script setup lang="ts">
defineProps<{
  items: Array<{ label: string; value: unknown }>;
  compact?: boolean;
}>();
</script>

<template>
  <dl
    class="mb-4 grid gap-3"
    :class="
      compact
        ? 'sm:grid-cols-2'
        : 'sm:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]'
    "
  >
    <div
      v-for="item in items"
      :key="item.label"
      class="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/90 p-3 dark:border-slate-700 dark:bg-slate-950/45"
    >
      <dt class="text-xs font-medium text-slate-500 dark:text-slate-400">
        {{ item.label }}
      </dt>
      <dd class="mt-1 [overflow-wrap:anywhere] text-sm font-bold text-slate-950 dark:text-white">
        {{ item.value ?? "Not loaded yet" }}
      </dd>
    </div>
  </dl>
</template>
