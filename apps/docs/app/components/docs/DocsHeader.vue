<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";
import { computed, shallowRef } from "vue";

import {
  createPrimaryNavigationItems,
  createSidebarNavigationItems,
  externalNavLinks,
} from "~/utils/docsNavigation";

type LanguageDropdownItem = DropdownMenuItem & {
  flag: string;
  isCurrent: boolean;
};

const getLocaleFlag = (language?: string) => {
  const region = language?.split("-")[1]?.toUpperCase();

  if (!region || !/^[A-Z]{2}$/.test(region)) {
    return "🌐";
  }

  return String.fromCodePoint(...[...region].map((letter) => letter.charCodeAt(0) + 127397));
};

const route = useRoute();
const localePath = useLocalePath();
const switchLocalePath = useSwitchLocalePath();
const { locale, locales, setLocale, t } = useI18n();

const isMobileMenuOpen = shallowRef(false);
const primaryItems = computed(() => createPrimaryNavigationItems(route.path, localePath, t));
const mobileItems = computed(() => [
  primaryItems.value,
  ...createSidebarNavigationItems(route.path, localePath, t),
]);
const translatedExternalLinks = computed(() =>
  externalNavLinks.map((link) => ({
    ...link,
    label: t(link.labelKey) || link.label,
  })),
);
const languageOptions = computed(() =>
  locales.value.map((availableLocale) => ({
    code: availableLocale.code,
    label: availableLocale.name ?? availableLocale.code.toUpperCase(),
    shortLabel: availableLocale.code.toUpperCase(),
    flag: getLocaleFlag(availableLocale.language),
    to: switchLocalePath(availableLocale.code),
    isCurrent: availableLocale.code === locale.value,
  })),
);
const currentLanguage = computed(
  () => languageOptions.value.find((option) => option.isCurrent) ?? languageOptions.value[0],
);
const languageDropdownItems = computed<LanguageDropdownItem[]>(() =>
  languageOptions.value.map((option) => ({
    label: option.label,
    flag: option.flag,
    isCurrent: option.isCurrent,
    ariaCurrent: option.isCurrent ? "true" : undefined,
    onSelect: () => setLocale(option.code),
    class: option.isCurrent
      ? "cursor-pointer text-highlighted before:bg-elevated hover:before:!bg-elevated"
      : "cursor-pointer hover:before:bg-elevated",
  })),
);
</script>

<template>
  <UHeader
    v-model:open="isMobileMenuOpen"
    :ui="{
      root: 'sticky top-0 z-50 h-(--ui-header-height) border-default/70 bg-default/85 backdrop-blur supports-[backdrop-filter]:bg-default/75',
      container: 'mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8',
    }"
  >
    <template #title>
      <DocsBrandLink />
    </template>

    <UNavigationMenu
      :items="primaryItems"
      color="neutral"
      variant="link"
      highlight
      class="hidden lg:flex"
    />

    <template #right>
      <UContentSearchButton class="hidden sm:inline-flex" />
      <UDropdownMenu
        :items="languageDropdownItems"
        :content="{ align: 'end' }"
        size="sm"
        class="hidden sm:inline-flex"
      >
        <UButton
          :label="currentLanguage?.shortLabel"
          icon="i-lucide-languages"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="t('navigation.language.change', { language: currentLanguage?.label })"
        />
        <template #item-leading="{ item }">
          <span class="text-base leading-none" aria-hidden="true">{{ item.flag }}</span>
        </template>
      </UDropdownMenu>
      <div
        class="hidden items-center gap-1 sm:flex"
        :aria-label="t('navigation.external.ariaLabel')"
      >
        <UButton
          v-for="link in translatedExternalLinks"
          :key="link.to"
          :to="link.to"
          :icon="link.icon"
          :aria-label="link.label"
          target="_blank"
          rel="noopener noreferrer"
          variant="ghost"
          color="neutral"
          size="sm"
        />
      </div>
      <UColorModeButton color="neutral" variant="ghost" />
    </template>

    <template #body>
      <div class="grid gap-4 pb-4">
        <UContentSearchButton block @click="isMobileMenuOpen = false" />
        <UNavigationMenu
          :items="mobileItems"
          orientation="vertical"
          color="neutral"
          variant="link"
          highlight
          class="-mx-2.5"
        />
        <div class="rounded-xl border border-default bg-muted/40 p-2">
          <p class="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted">
            {{ t("navigation.language.label") }}
          </p>
          <UButton
            v-for="option in languageOptions"
            :key="option.code"
            :to="option.to"
            :color="option.isCurrent ? 'primary' : 'neutral'"
            :variant="option.isCurrent ? 'solid' : 'ghost'"
            :aria-current="option.isCurrent ? 'true' : undefined"
            class="mb-1 w-full justify-between last:mb-0"
          >
            <span class="flex items-center gap-2">
              <span aria-hidden="true">{{ option.flag }}</span>
              <span>{{ option.label }}</span>
            </span>
          </UButton>
        </div>
        <div
          class="flex items-center gap-1 border-t border-default pt-3"
          :aria-label="t('navigation.external.ariaLabel')"
        >
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
            size="sm"
          />
        </div>
      </div>
    </template>
  </UHeader>
</template>
