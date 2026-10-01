<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { externalNavLinks } from "~/utils/docsNavigation";

const { t } = useI18n();
const copyrightYear = 2026;
const translatedExternalLinks = computed(() =>
  externalNavLinks.map((link) => ({ ...link, label: t(link.labelKey) })),
);
</script>

<template>
  <footer class="relative border-t border-default/70">
    <div
      class="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-muted sm:px-6 lg:px-8"
    >
      <p>
        &copy; {{ copyrightYear }} Vue Solana. {{ $t("footer.releasedUnder") }}
        <NuxtLink
          to="https://github.com/vue-solana/vue-solana/blob/main/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1"
        >
          {{ $t("footer.mitLicense") }} <UIcon name="i-ph-arrow-up-right" class="w-4 h-4" />
        </NuxtLink>
      </p>

      <nav class="flex items-center gap-1" aria-label="Package and source links">
        <UButton
          v-for="link in translatedExternalLinks"
          :key="link.to"
          :to="link.to"
          :icon="link.icon"
          :label="link.label"
          target="_blank"
          rel="noopener noreferrer"
          variant="ghost"
          color="neutral"
          size="xs"
        />
      </nav>
    </div>
  </footer>
</template>
