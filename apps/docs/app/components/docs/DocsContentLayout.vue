<script setup lang="ts">
type TocLink = {
  id: string;
  text: string;
  depth: number;
  children?: TocLink[];
};

type DocsPage = {
  title?: unknown;
  description?: unknown;
  body?: {
    toc?: {
      links?: TocLink[];
    };
  };
};

type SurroundLink = {
  title: string;
  path: string;
  description?: string;
  [key: string]: unknown;
};

defineProps<{
  activePath: string;
  page: DocsPage;
  surround?: SurroundLink[] | null;
}>();
</script>

<template>
  <UPage class="mx-auto w-full max-w-[1180px] flex-1 px-4 sm:px-6 lg:px-8">
    <template #left>
      <DocsSidebar :active-path="activePath" />
    </template>

    <DocsArticle :page="page" :surround="surround" />
  </UPage>
</template>
