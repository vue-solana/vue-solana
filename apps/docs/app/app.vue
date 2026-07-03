<script setup lang="ts">
import { queryCollectionNavigation } from "#imports";

const { data: navigation } = await useAsyncData("content-navigation", () => {
  return queryCollectionNavigation("content");
});
</script>

<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <DocsAppShell>
      <NuxtPage />
    </DocsAppShell>
    <UContentSearch :navigation="navigation ?? []" />
  </UApp>
</template>
