<script setup lang="ts">
const route = useRoute();

const sections = [
  {
    title: "Start",
    links: [
      { label: "Overview", to: "/" },
      { label: "Getting Started", to: "/getting-started" },
      { label: "Troubleshooting", to: "/troubleshooting" },
    ],
  },
  {
    title: "Concepts",
    links: [
      { label: "Solana For Vue Developers", to: "/concepts/solana-for-vue-developers" },
      { label: "Clusters", to: "/concepts/clusters" },
      { label: "Wallets", to: "/concepts/wallets" },
    ],
  },
  {
    title: "Packages",
    links: [
      { label: "@vue-solana/core", to: "/packages/core" },
      { label: "@vue-solana/vue", to: "/packages/vue" },
      { label: "@vue-solana/nuxt", to: "/packages/nuxt" },
    ],
  },
  {
    title: "Examples",
    links: [
      { label: "Vue Vite", to: "/examples/vue-vite" },
      { label: "Nuxt", to: "/examples/nuxt" },
    ],
  },
];

function isActivePath(path: string) {
  return route.path === path;
}

const { data: page } = await useAsyncData("page-" + route.path, () => {
  return queryCollection("content").path(route.path).first();
});

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: "Page not found", fatal: true });
}

useHead({
  title: () => `${page.value?.title ?? "Docs"} - Vue Solana`,
});
</script>

<template>
  <main
    class="grid flex-1 gap-6 pb-12 pt-3 lg:min-h-0 lg:grid-cols-[18rem_minmax(0,1fr)] lg:overflow-hidden lg:gap-8 lg:pb-8 lg:pt-6"
  >
    <aside
      class="lg:sticky lg:top-0 lg:max-h-full lg:self-start lg:overflow-y-auto"
      aria-label="Documentation navigation"
    >
      <UCard
        variant="subtle"
        class="border-slate-200/80 bg-white/85 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80"
      >
        <div class="mb-5 flex items-center justify-between gap-3">
          <div>
            <p
              class="text-xs font-bold uppercase tracking-[0.2em] text-violet-700 dark:text-violet-300"
            >
              Docs
            </p>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Build Solana apps with Vue.
            </p>
          </div>
        </div>

        <nav class="grid gap-5">
          <section v-for="section in sections" :key="section.title" class="grid gap-2">
            <strong
              class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400"
            >
              {{ section.title }}
            </strong>
            <div class="grid gap-1">
              <UButton
                v-for="link in section.links"
                :key="link.to"
                :to="link.to"
                color="neutral"
                :variant="isActivePath(link.to) ? 'soft' : 'ghost'"
                size="sm"
                block
                class="justify-start font-semibold"
              >
                {{ link.label }}
              </UButton>
            </div>
          </section>
        </nav>
      </UCard>
    </aside>

    <UCard
      variant="subtle"
      class="min-w-0 border-slate-200/80 bg-white/90 shadow-xl shadow-slate-900/5 backdrop-blur lg:min-h-0 lg:overflow-y-auto dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-black/20"
      :ui="{ body: 'p-6 sm:p-8 lg:p-10' }"
    >
      <article class="docs-content">
        <ContentRenderer v-if="page" :value="page" />
      </article>
    </UCard>
  </main>
</template>
