<template>
  <div
    class="min-h-screen overflow-x-hidden bg-white text-slate-950 lg:h-screen lg:overflow-hidden dark:bg-slate-950 dark:text-white"
  >
    <DocsBackground />

    <div
      class="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 sm:px-6 lg:h-screen lg:px-8"
    >
      <DocsHeader />
      <slot />
    </div>
  </div>
</template>
