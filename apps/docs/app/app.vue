<script setup lang="ts">
import { queryCollectionNavigation, useSearchCollection } from "#imports";
import type { SearchCollectionOptions, SearchResult } from "@nuxt/content/dist/runtime/client.js";

const { locale, locales, t } = useI18n();

const htmlLang = computed(() => {
  const currentLocale = locales.value.find(
    (availableLocale) => availableLocale.code === locale.value,
  );

  return currentLocale?.language ?? locale.value;
});

const { data: navigation } = await useAsyncData("content-navigation", () => {
  return queryCollectionNavigation("content");
});

const { search, status: searchStatus } = useSearchCollection("content");

const localePrefix = computed(() => (locale.value === "en" ? "" : `/${locale.value}`));

const searchCurrentLocale = async (query: string, opts?: SearchCollectionOptions) => {
  const results = await search(query, opts);
  return results.filter((result: SearchResult) => {
    const segment = result.id.split("#")[0];
    return localePrefix.value
      ? segment.startsWith(`${localePrefix.value}/`) || segment === localePrefix.value
      : !/^\/(es|ko|zh)(\/|$)/.test(segment);
  });
};

useHead({
  htmlAttrs: {
    lang: () => htmlLang.value,
  },
});
</script>

<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <DocsAppShell>
      <NuxtPage />
    </DocsAppShell>
    <UContentSearch
      :navigation="navigation ?? []"
      :search="searchCurrentLocale"
      :search-status="searchStatus"
      :color-mode="false"
      :placeholder="t('search.placeholder')"
    />
  </UApp>
</template>
