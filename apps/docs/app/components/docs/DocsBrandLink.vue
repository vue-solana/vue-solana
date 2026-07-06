<script setup lang="ts">
const localePath = useLocalePath();
</script>

<template>
  <NuxtLink
    aria-label="Vue Solana home"
    class="group inline-flex items-center gap-2.5 text-inherit no-underline"
    :to="localePath('/')"
  >
    <UColorModeImage
      light="/VueSolana.png"
      dark="/VueSolana-dark.png"
      alt="Vue Solana Logo"
      class="w-40"
      :width="160"
      :height="42"
    />
  </NuxtLink>
</template>
