<script setup lang="ts">
import { computed } from "vue";

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

const props = defineProps<{
  page: DocsPage;
  surround?: SurroundLink[] | null;
}>();

const title = computed(() => (typeof props.page.title === "string" ? props.page.title : "Docs"));
const description = computed(() =>
  typeof props.page.description === "string" ? props.page.description : undefined,
);
const tocLinks = computed<TocLink[]>(() => {
  return props.page.body?.toc?.links ?? [];
});

const surroundLinks = computed(() => props.surround ?? undefined);
</script>

<template>
  <UPage>
    <UPageHeader :title="title" :description="description" />

    <UPageBody>
      <article class="docs-content">
        <ContentRenderer :value="page" />
      </article>

      <USeparator class="my-10" />
      <UContentSurround :surround="surroundLinks" />
    </UPageBody>

    <template #right>
      <DocsTableOfContents :links="tocLinks" />
    </template>
  </UPage>
</template>
