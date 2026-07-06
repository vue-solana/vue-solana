<script setup lang="ts">
import { showError, useLazyAsyncData } from "#imports";
import { watchEffect } from "vue";

import { createDocsPageStructuredData, serializeJsonLd } from "~/utils/structuredData";

type LocaleOption = string | { code?: string };

const getLocaleCode = (localeOption: LocaleOption) => {
  return typeof localeOption === "string" ? localeOption : localeOption.code;
};

const getRouteLocaleCode = (path: string, localeCodes: string[]) => {
  return localeCodes.find((code) => path === `/${code}` || path.startsWith(`/${code}/`));
};

const route = useRoute();
const { locales } = useI18n();

const localeCodes = computed(() =>
  locales.value.map(getLocaleCode).filter((code): code is string => !!code),
);

const { data: page, status } = await useAsyncData(
  "page-" + route.path,
  () => queryCollection("content").path(route.path).first(),
  {
    lazy: import.meta.client,
    watch: [() => route.path],
  },
);

const { data: surround } = useLazyAsyncData(
  "surround-" + route.path,
  () => {
    const routeLocaleCode = getRouteLocaleCode(route.path, localeCodes.value);
    let query = queryCollectionItemSurroundings("content", route.path);

    if (routeLocaleCode) {
      const localeRoot = `/${routeLocaleCode}`;

      query = query.orWhere((group) =>
        group.where("path", "=", localeRoot).where("path", "LIKE", `${localeRoot}/%`),
      );
    } else {
      for (const code of localeCodes.value) {
        const localeRoot = `/${code}`;

        query = query.where("path", "<>", localeRoot).where("path", "NOT LIKE", `${localeRoot}/%`);
      }
    }

    return query.order("surroundOrder", "ASC");
  },
  {
    watch: [() => route.path],
  },
);

if (import.meta.server && !page.value) {
  throw createError({ statusCode: 404, statusMessage: "Page not found", fatal: true });
}

watchEffect(() => {
  if (import.meta.client && status.value === "success" && !page.value) {
    showError(createError({ statusCode: 404, statusMessage: "Page not found", fatal: true }));
  }
});

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

  <UPage v-else class="mx-auto w-full max-w-[1180px] flex-1 px-4 py-8 sm:px-6 lg:px-8">
    <div class="grid gap-4" aria-busy="true" aria-label="Loading documentation page">
      <USkeleton class="h-10 w-3/4 max-w-xl" />
      <USkeleton class="h-5 w-full max-w-2xl" />
      <USkeleton class="h-5 w-5/6 max-w-2xl" />
      <div class="mt-6 grid gap-3">
        <USkeleton v-for="line in 8" :key="line" class="h-4 w-full" />
      </div>
    </div>
  </UPage>
</template>
