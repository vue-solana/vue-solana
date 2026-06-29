<script setup lang="ts">
import { docsNavSections } from "~/utils/docsNavigation";

defineProps<{
  activePath: string;
}>();
</script>

<template>
  <aside
    class="hide-scrollbar lg:sticky lg:top-0 lg:max-h-full lg:self-start lg:overflow-y-auto"
    aria-label="Documentation navigation"
  >
    <UCard
      variant="subtle"
      class="border-slate-200/80 bg-white/85 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80"
    >
      <div class="mb-5">
        <p
          class="text-xs font-bold uppercase tracking-[0.2em] text-violet-700 dark:text-violet-300"
        >
          Docs
        </p>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">Build Solana apps with Vue.</p>
      </div>

      <nav class="grid gap-5">
        <section v-for="section in docsNavSections" :key="section.title" class="grid gap-2">
          <strong
            class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400"
          >
            {{ section.title }}
          </strong>
          <div class="grid gap-1">
            <UButton
              v-for="link in section.links"
              :key="link.to"
              :to="link.to"
              color="neutral"
              :variant="activePath === link.to ? 'soft' : 'ghost'"
              size="sm"
              block
              class="justify-start font-semibold"
            >
              {{ link.label }}
            </UButton>
          </div>
        </section>
      </nav>
    </UCard>
  </aside>
</template>
