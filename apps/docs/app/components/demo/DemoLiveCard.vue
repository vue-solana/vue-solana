<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  eyebrow: string;
  error?: string | null;
  status: string;
  text: string;
  title: string;
}>();

const { t } = useI18n();
const translatedStatus = computed(() => t(`demo.status.${props.status}`, props.status));
const statusColor = computed(() => {
  if (props.status === "error") {
    return "error" as const;
  }

  if (["success", "loaded"].includes(props.status)) {
    return "success" as const;
  }

  if (["fetching", "loading"].includes(props.status)) {
    return "warning" as const;
  }

  return "neutral" as const;
});
</script>

<template>
  <DemoPanel
    :eyebrow="eyebrow"
    :title="title"
    :status="translatedStatus"
    :status-color="statusColor"
  >
    <p class="text-base font-bold [overflow-wrap:anywhere] text-slate-950 dark:text-white">
      {{ text }}
    </p>
    <UAlert v-if="error" color="error" variant="subtle" class="mt-3" :title="error" />
  </DemoPanel>
</template>
