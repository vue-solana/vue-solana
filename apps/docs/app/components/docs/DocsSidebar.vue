<script setup lang="ts">
import { computed } from "vue";

import { createSidebarNavigationItems } from "~/utils/docsNavigation";

const props = defineProps<{
  activePath: string;
}>();

const localePath = useLocalePath();
const { t } = useI18n();

const navigationItems = computed(() =>
  createSidebarNavigationItems(props.activePath, localePath, t),
);
</script>

<template>
  <UPageAside :aria-label="t('navigation.sidebar.ariaLabel')">
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
