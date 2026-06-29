<script setup lang="ts">
defineProps<{
  packageVersions: Array<{ name: string; version: string }>;
}>();
</script>

<template>
  <section
    class="rounded-[1.4rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgb(255_255_255_/_0.94),rgb(248_250_252_/_0.86))] p-5 shadow-xl shadow-slate-900/5 backdrop-blur sm:p-8 lg:col-span-2 xl:col-span-3 dark:border-slate-800 dark:bg-[linear-gradient(135deg,rgb(15_23_42_/_0.9),rgb(2_6_23_/_0.82))]"
  >
    <p
      class="mb-2 text-xs font-black uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300"
    >
      Live Devnet Demo
    </p>
    <h1
      class="max-w-[13ch] text-5xl font-black tracking-[-0.06em] text-slate-950 sm:text-7xl dark:text-white"
    >
      Vue Solana in a real Nuxt app
    </h1>
    <p class="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
      This page runs against the published Vue Solana packages. Try RPC reads, balance lookup,
      Wallet Standard discovery, connect/disconnect, and a tiny real devnet transfer.
    </p>

    <dl class="mt-5 flex flex-wrap gap-3" aria-label="Vue Solana package versions">
      <div
        v-for="pkg in packageVersions"
        :key="pkg.name"
        class="min-w-40 rounded-full border border-violet-300/50 bg-white/70 px-4 py-2 dark:border-violet-200/30 dark:bg-slate-950/40"
      >
        <dt class="text-xs font-black text-violet-800 dark:text-violet-200">
          {{ pkg.name }}
        </dt>
        <dd class="mt-0.5 text-sm font-bold text-slate-950 dark:text-white">v{{ pkg.version }}</dd>
      </div>
    </dl>
  </section>
</template>
