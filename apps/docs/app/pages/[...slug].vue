<script setup lang="ts">
import { queryCollectionItemSurroundings } from "#imports";

const route = useRoute();

const { data: page } = await useAsyncData("page-" + route.path, () => {
  return queryCollection("content").path(route.path).first();
});

const { data: surround } = await useAsyncData("surround-" + route.path, () => {
  return queryCollectionItemSurroundings("content", route.path);
});

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: "Page not found", fatal: true });
}

useHead({
  title: () => `${page.value?.title ?? "Docs"} - Vue Solana`,
});
</script>

<template>
  <DocsContentLayout v-if="page" :active-path="route.path" :page="page" :surround="surround" />
</template>
