<script setup lang="ts">
defineProps<{
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
}>();
</script>

<template>
  <section :id="id" class="scroll-mt-[calc(var(--ui-header-height)+4rem)]">
    <div class="mb-4">
      <p
        class="mb-1 text-xs font-black uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300"
      >
        {{ eyebrow }}
      </p>
      <h2 class="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
        {{ title }}
      </h2>
      <p
        v-if="description"
        class="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300"
      >
        {{ description }}
      </p>
    </div>

    <div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <slot />
    </div>
  </section>
</template>
