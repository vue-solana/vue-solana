<script setup lang="ts">
import { computed } from "vue";

import {
  createPrimaryNavigationItems,
  createSidebarNavigationItems,
  externalNavLinks,
} from "~/utils/docsNavigation";

const route = useRoute();

const primaryItems = computed(() => createPrimaryNavigationItems(route.path));
const mobileItems = computed(() => [
  primaryItems.value,
  ...createSidebarNavigationItems(route.path),
]);
</script>

<template>
  <UHeader
    :ui="{
      root: 'sticky top-0 z-50 h-(--ui-header-height) border-default/70 bg-default/85 backdrop-blur supports-[backdrop-filter]:bg-default/75',
      container: 'mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8',
    }"
  >
    <template #title>
      <DocsBrandLink />
    </template>

    <UNavigationMenu
      :items="primaryItems"
      color="neutral"
      variant="link"
      highlight
      class="hidden lg:flex"
    />

    <template #right>
      <UContentSearchButton class="hidden sm:inline-flex" />
      <div class="hidden items-center gap-1 sm:flex" aria-label="External links">
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
      </div>
      <UColorModeButton color="neutral" variant="ghost" />
    </template>

    <template #body>
      <div class="grid gap-4 pb-4">
        <UContentSearchButton block />
        <UNavigationMenu
          :items="mobileItems"
          orientation="vertical"
          color="neutral"
          variant="link"
          highlight
          class="-mx-2.5"
        />
        <div
          class="flex items-center gap-1 border-t border-default pt-3"
          aria-label="External links"
        >
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
            size="sm"
          />
        </div>
      </div>
    </template>
  </UHeader>
</template>
