<script setup lang="ts">
const route = useRoute();

const { data: page } = await useAsyncData("page-" + route.path, () => {
  return queryCollection("content").path(route.path).first();
});

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: "Page not found", fatal: true });
}

useHead({
  title: () => `${page.value?.title ?? "Docs"} - Vue Solana`,
});
</script>

<template>
  <DocsContentLayout v-if="page" :active-path="route.path" :page="page" />
</template>
