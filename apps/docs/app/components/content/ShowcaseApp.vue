<script setup lang="ts">
// MDC component for content pages: rendered from Markdown via
// `::ShowcaseApp{name="..." url="..." logo="/..." tag="..."} ... ::`.
// App copy (the description) comes through the default slot so every locale
// page can translate it inline. All styling leans on the docs design tokens:
// the slate card from the demo panels, violet links from `.docs-content a`.
defineProps<{
  name: string;
  url: string;
  logo: string;
  tag?: string;
}>();

const { t } = useI18n();
</script>

<template>
  <article
    class="my-8 flex flex-col gap-5 rounded-[1.4rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgb(255_255_255_/_0.94),rgb(248_250_252_/_0.86))] p-5 shadow-xl shadow-slate-900/5 backdrop-blur sm:flex-row sm:items-start sm:p-6 dark:border-slate-800 dark:bg-[linear-gradient(135deg,rgb(15_23_42_/_0.9),rgb(2_6_23_/_0.82))]"
  >
    <!-- The logo is a dark PNG, so it stays on a white chip in dark mode. -->
    <a
      :href="url"
      target="_blank"
      rel="noopener noreferrer"
      class="shrink-0 self-start rounded-2xl focus-visible:outline-2"
      :aria-label="name"
    >
      <img
        :src="logo"
        :alt="t('showcase.logoAlt', { name })"
        width="356"
        height="368"
        loading="lazy"
        class="h-20 w-20 rounded-2xl border border-slate-200/80 bg-white object-contain p-1.5 sm:h-24 sm:w-24 dark:border-slate-800"
      />
    </a>

    <div class="min-w-0 flex-1">
      <p class="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <a :href="url" target="_blank" rel="noopener noreferrer" class="text-lg tracking-tight">
          {{ name }}
        </a>
        <UBadge v-if="tag" color="primary" variant="subtle">{{ tag }}</UBadge>
      </p>

      <div class="showcase-app-description">
        <slot />
      </div>

      <p class="mt-1">
        <a
          :href="url"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 text-sm"
        >
          {{ t("showcase.visitSite") }}
          <UIcon name="i-ph-arrow-up-right" class="h-4 w-4" />
        </a>
      </p>
    </div>
  </article>
</template>
