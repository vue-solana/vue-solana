<template>
  <div class="min-h-screen overflow-x-clip bg-default text-highlighted">
    <DocsBackground />
    <DocsHeader />

    <UMain class="relative">
      <slot />
    </UMain>

    <DocsFooter />
  </div>
</template>
