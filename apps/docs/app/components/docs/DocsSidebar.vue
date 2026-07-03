<script setup lang="ts">
import { computed } from "vue";

import { createSidebarNavigationItems } from "~/utils/docsNavigation";

const props = defineProps<{
  activePath: string;
}>();

const navigationItems = computed(() => createSidebarNavigationItems(props.activePath));
</script>

<template>
  <UPageAside aria-label="Documentation navigation">
    <UNavigationMenu
      :items="navigationItems"
      orientation="vertical"
      color="neutral"
      variant="link"
      highlight
      class="-mx-2.5"
    />
  </UPageAside>
</template>
