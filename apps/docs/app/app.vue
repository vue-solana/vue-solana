<script setup lang="ts">
import { queryCollectionNavigation, useSearchCollection } from "#imports";

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

// `SearchCollectionOptions` and `SearchResult` only exist in subpaths `@nuxt/content`
// does not export, so the signature is taken from `search` instead of imported.
const searchCurrentLocale = async (...args: Parameters<typeof search>) => {
  const results = await search(...args);
  return results.filter((result) => {
    const [segment = ""] = result.id.split("#");
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
