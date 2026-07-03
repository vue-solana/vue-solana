<template>
  <div class="min-h-screen overflow-x-hidden bg-default text-highlighted">
    <DocsBackground />
    <DocsHeader />

    <UMain class="relative">
      <slot />
    </UMain>
  </div>
</template>
