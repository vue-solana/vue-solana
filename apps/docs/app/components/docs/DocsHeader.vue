<script setup lang="ts">
import { externalNavLinks, isPrimaryNavLinkActive, primaryNavLinks } from "~/utils/docsNavigation";

const route = useRoute();
</script>

<template>
  <header
    class="sticky top-0 z-20 flex flex-col gap-5 border-b border-slate-200/70 bg-white/85 py-5 backdrop-blur sm:py-6 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800/80 dark:bg-slate-950/85"
  >
    <DocsBrandLink />

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
      <nav class="flex flex-wrap gap-2" aria-label="Primary navigation">
        <UButton
          v-for="link in primaryNavLinks"
          :key="link.to"
          :to="link.to"
          :variant="isPrimaryNavLinkActive(route.path, link.to) ? 'soft' : 'ghost'"
          color="neutral"
          size="sm"
          class="font-semibold"
        >
          {{ link.label }}
        </UButton>
      </nav>

      <nav class="flex flex-wrap gap-2" aria-label="External links">
        <UButton
          v-for="link in externalNavLinks"
          :key="link.to"
          :to="link.to"
          :icon="link.icon"
          :aria-label="link.label"
          target="_blank"
          rel="noopener noreferrer"
          variant="ghost"
          color="neutral"
          size="sm"
        />
      </nav>
    </div>
  </header>
</template>
