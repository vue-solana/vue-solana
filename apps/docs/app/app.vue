<script setup lang="ts">
const navLinks = [
  { label: 'Get Started', to: '/getting-started' },
  { label: 'Concepts', to: '/concepts/solana-for-vue-developers' },
  { label: 'Packages', to: '/packages/vue' },
  { label: 'Examples', to: '/examples/vue-vite' },
]
</script>

<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <div class="min-h-screen overflow-hidden bg-white text-slate-950 dark:bg-slate-950 dark:text-white">
      <div class="pointer-events-none fixed inset-0 -z-10">
        <div class="absolute -left-48 -top-56 size-136 rounded-full bg-emerald-300/35 blur-3xl dark:bg-emerald-400/15" />
        <div class="absolute -right-40 top-20 size-120 rounded-full bg-violet-400/25 blur-3xl dark:bg-violet-500/20" />
        <div class="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-violet-400/70 to-transparent" />
      </div>

      <div class="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
        <header class="flex flex-col gap-5 py-5 sm:py-6 lg:flex-row lg:items-center lg:justify-between">
          <NuxtLink class="group inline-flex items-center gap-3 text-inherit no-underline" to="/">
            <span class="grid size-11 place-items-center rounded-2xl bg-linear-to-br from-emerald-300 via-cyan-300 to-violet-500 text-sm font-black text-slate-950 shadow-lg shadow-violet-500/20 transition-transform group-hover:scale-105">
              VS
            </span>
            <span class="leading-tight">
              <span class="block text-base font-bold tracking-tight text-slate-950 dark:text-white">Vue Solana</span>
              <span class="block text-sm font-medium text-slate-600 dark:text-slate-400">Documentation</span>
            </span>
          </NuxtLink>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
            <nav class="flex flex-wrap gap-2" aria-label="Primary navigation">
              <UButton
                v-for="link in navLinks"
                :key="link.to"
                :to="link.to"
                :variant="$route.path.startsWith(link.to.split('/').slice(0, 2).join('/')) ? 'soft' : 'ghost'"
                color="neutral"
                size="sm"
                class="font-semibold"
              >
                {{ link.label }}
              </UButton>
            </nav>

<!--            <UColorModeButton class="self-start" />-->
          </div>
        </header>

        <NuxtPage />
      </div>
    </div>
  </UApp>
</template>

<style>
.docs-content {
  min-width: 0;
}

.docs-content h1 {
  margin-top: 0;
  font-size: clamp(2.25rem, 7vw, 4.5rem);
  line-height: 0.95;
  letter-spacing: -0.06em;
  color: rgb(15 23 42);
}

:where(.dark, .dark-mode) .docs-content h1 {
  color: white;
}

.docs-content h2 {
  margin-top: 2.4rem;
  padding-top: 0.8rem;
  border-top: 1px solid rgb(226 232 240);
  color: rgb(15 23 42);
}

:where(.dark, .dark-mode) .docs-content h2 {
  border-top-color: rgb(51 65 85);
  color: white;
}

.docs-content h3 {
  margin-top: 1.8rem;
  color: rgb(30 41 59);
}

:where(.dark, .dark-mode) .docs-content h3 {
  color: rgb(226 232 240);
}

.docs-content p,
.docs-content li {
  color: rgb(51 65 85);
}

:where(.dark, .dark-mode) .docs-content p,
:where(.dark, .dark-mode) .docs-content li {
  color: rgb(203 213 225);
}

.docs-content a {
  color: rgb(109 40 217);
  font-weight: 650;
  text-decoration: none;
}

.docs-content a:hover {
  text-decoration: underline;
}

:where(.dark, .dark-mode) .docs-content a {
  color: rgb(167 139 250);
}

.docs-content code {
  border-radius: 6px;
  padding: 0.12rem 0.32rem;
  background: rgb(241 245 249);
  color: rgb(88 28 135);
}

:where(.dark, .dark-mode) .docs-content code {
  background: rgb(30 41 59);
  color: rgb(216 180 254);
}

.docs-content pre {
  overflow-x: auto;
  padding: 18px;
  border-radius: 16px;
  background: rgb(248 250 252);
  color: rgb(15 23 42);
  border: 1px solid rgb(203 213 225);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.8);
}

:where(.dark, .dark-mode) .docs-content pre {
  background: rgb(2 6 23);
  color: rgb(226 232 240);
  border-color: rgb(71 85 105);
  box-shadow: inset 0 1px 0 rgb(148 163 184 / 0.12);
}

.docs-content pre code {
  padding: 0;
  background: transparent;
  color: inherit;
}
</style>
