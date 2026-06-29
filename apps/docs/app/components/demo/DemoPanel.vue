<script setup lang="ts">
withDefaults(
  defineProps<{
    eyebrow: string;
    title: string;
    status?: string;
    statusColor?: "neutral" | "primary" | "secondary" | "success" | "info" | "warning" | "error";
    wide?: boolean;
  }>(),
  {
    status: undefined,
    statusColor: "neutral",
    wide: false,
  },
);
</script>

<template>
  <UCard
    variant="subtle"
    class="min-w-0 border-slate-200/80 bg-[linear-gradient(135deg,rgb(255_255_255_/_0.94),rgb(248_250_252_/_0.86))] shadow-xl shadow-slate-900/5 backdrop-blur dark:border-slate-800 dark:bg-[linear-gradient(135deg,rgb(15_23_42_/_0.9),rgb(2_6_23_/_0.82))] dark:shadow-black/20"
    :class="{ 'lg:col-span-2 xl:col-span-2': wide }"
    :ui="{ root: 'rounded-[1.4rem] overflow-visible', body: 'p-4 sm:p-5' }"
  >
    <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <p
          class="mb-1 text-xs font-black uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300"
        >
          {{ eyebrow }}
        </p>
        <h2 class="text-xl font-black tracking-tight text-slate-950 dark:text-white">
          {{ title }}
        </h2>
      </div>
      <UBadge v-if="status" :color="statusColor" variant="subtle" class="uppercase">
        {{ status }}
      </UBadge>
    </div>

    <slot />
  </UCard>
</template>
