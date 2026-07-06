<script setup lang="ts">
import { createDocsPageStructuredData, serializeJsonLd } from "~/utils/structuredData";

const route = useRoute();

const { data: page } = await useAsyncData("page-" + route.path, () => {
  return queryCollection("content").path(route.path).first();
});

const { data: surround } = await useAsyncData("surround-" + route.path, () => {
  return queryCollectionItemSurroundings("content", route.path).order("surroundOrder", "ASC");
});

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: "Page not found", fatal: true });
}

const title = computed(() => page.value?.title ?? "Docs");
const description = computed(() => {
  return (
    page.value?.description ??
    "Documentation for Vue and Nuxt libraries that help developers use Solana."
  );
});
const ogTitle = computed(() => page.value?.ogTitle ?? title.value);
const ogDescription = computed(() => page.value?.ogDescription ?? description.value);
const ogSection = computed(() => page.value?.ogSection ?? "Documentation");

useSeoMeta({
  title: () => `${title.value} - Vue Solana`,
  description,
  ogTitle: () => `${ogTitle.value} - Vue Solana`,
  ogDescription,
  ogSiteName: "Vue Solana",
  ogType: "article",
  twitterCard: "summary_large_image",
  twitterTitle: () => `${ogTitle.value} - Vue Solana`,
  twitterDescription: ogDescription,
});

defineOgImage("Docs", {
  title: ogTitle,
  description: ogDescription,
  section: ogSection,
});

useHead({
  script: [
    {
      key: () => `docs-json-ld-${route.path}`,
      type: "application/ld+json",
      innerHTML: () =>
        serializeJsonLd(
          createDocsPageStructuredData({
            path: route.path,
            title: title.value,
            description: description.value,
            section: ogSection.value,
          }),
        ),
    },
  ],
});
</script>

<template>
  <DocsContentLayout v-if="page" :active-path="route.path" :page="page" :surround="surround" />
</template>
