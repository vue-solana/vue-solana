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
      :search="search"
      :search-status="searchStatus"
      :color-mode="false"
      :placeholder="t('search.placeholder')"
    />
  </UApp>
</template>
