<script setup lang="ts">
useHead({
  title: "Live Demo - Vue Solana",
});
</script>

<template>
  <main class="flex-1 py-8 lg:min-h-0 lg:overflow-y-auto">
    <section
      class="mx-auto max-w-3xl rounded-[2rem] border border-violet-200/80 bg-white/90 p-6 shadow-xl shadow-violet-950/5 backdrop-blur sm:p-8 dark:border-violet-900/60 dark:bg-slate-900/85 dark:shadow-black/20"
    >
      <p class="text-xs font-bold uppercase tracking-[0.22em] text-violet-700 dark:text-violet-300">
        Live Demo
      </p>
      <h1
        class="mt-3 text-4xl font-black tracking-[-0.055em] text-slate-950 sm:text-6xl dark:text-white"
      >
        Demo coming soon.
      </h1>
      <p class="mt-4 text-base leading-7 text-slate-600 sm:text-lg dark:text-slate-300">
        The live docs demo is disabled until the next Vue Solana packages are published to npm. It
        will use the published packages for RPC reads, wallet discovery, wallet connection, and
        devnet transfers.
      </p>
      <UButton class="mt-6" to="/getting-started" color="primary" variant="soft">
        Read Getting Started
      </UButton>
    </section>
  </main>
</template>
