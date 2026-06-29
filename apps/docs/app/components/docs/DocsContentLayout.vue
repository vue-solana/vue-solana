<script setup lang="ts">
defineProps<{
  activePath: string;
  page: Record<string, unknown>;
}>();
</script>

<template>
  <main
    class="grid flex-1 gap-6 pb-12 pt-3 lg:min-h-0 lg:grid-cols-[18rem_minmax(0,1fr)] lg:overflow-hidden lg:gap-8 lg:pb-8 lg:pt-6"
  >
    <DocsSidebar :active-path="activePath" />
    <DocsArticle :page="page" />
  </main>
</template>
