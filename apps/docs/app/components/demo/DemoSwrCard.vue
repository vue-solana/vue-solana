<script setup lang="ts">
import { ref } from "vue";

const visible = ref(true);
</script>

<template>
  <DemoPanel eyebrow="useSolanaRequestSwr" :title="$t('demo.liveData.swr.title')">
    <p class="text-sm leading-6 text-slate-600 dark:text-slate-300">
      {{ $t("demo.liveData.swr.description") }}
    </p>

    <UButton color="primary" variant="soft" size="sm" class="mt-4" @click="visible = !visible">
      {{ visible ? $t("demo.liveData.swr.toggleHide") : $t("demo.liveData.swr.toggleShow") }}
    </UButton>

    <DemoSwrCardInner v-if="visible" class="mt-4" />
    <p v-else class="mt-4 text-sm font-bold text-slate-950 dark:text-white">
      {{ $t("demo.liveData.swr.hidden") }}
    </p>
  </DemoPanel>
</template>
