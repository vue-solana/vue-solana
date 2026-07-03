<script setup lang="ts">
import { externalNavLinks } from "~/utils/docsNavigation";

const copyrightYear = 2026;
</script>

<template>
  <footer class="relative border-t border-default/70">
    <div
      class="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-muted sm:px-6 lg:px-8"
    >
      <p>&copy; {{ copyrightYear }} Vue Solana. All rights reserved.</p>

      <nav class="flex items-center gap-1" aria-label="Package and source links">
        <UButton
          v-for="link in externalNavLinks"
          :key="link.to"
          :to="link.to"
          :icon="link.icon"
          :label="link.label"
          target="_blank"
          rel="noopener noreferrer"
          variant="ghost"
          color="neutral"
          size="xs"
        />
      </nav>
    </div>
  </footer>
</template>
