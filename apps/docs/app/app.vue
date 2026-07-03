<script setup lang="ts">
import { queryCollectionNavigation, useSearchCollection } from "#imports";

const { data: navigation } = await useAsyncData("content-navigation", () => {
  return queryCollectionNavigation("content");
});

const { search, status: searchStatus } = useSearchCollection("content");
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
      placeholder="Search documentation..."
    />
  </UApp>
</template>
