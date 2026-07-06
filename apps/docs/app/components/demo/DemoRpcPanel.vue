<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  pluginInstalled: boolean;
  status: string;
  cluster: string;
  endpoint: string;
  wsEndpoint?: string;
  latestBlockhash?: string | null;
  error?: unknown;
}>();

const emit = defineEmits<{
  checkRpc: [];
}>();

const { t } = useI18n();

const translatedStatus = computed(() => t(`demo.status.${props.status}`, props.status));

const items = computed(() => [
  {
    label: t("demo.rpc.labels.pluginInstalled"),
    value: props.pluginInstalled ? t("common.yes") : t("common.no"),
  },
  { label: t("demo.rpc.labels.cluster"), value: props.cluster },
  { label: t("demo.rpc.labels.endpoint"), value: props.endpoint },
  { label: t("demo.rpc.labels.wsEndpoint"), value: props.wsEndpoint },
  { label: t("demo.rpc.labels.latestBlockhash"), value: props.latestBlockhash },
  ...(props.error ? [{ label: t("demo.rpc.labels.error"), value: props.error }] : []),
]);
</script>

<template>
  <DemoPanel
    eyebrow="useSolana + useSolanaRpc"
    :title="$t('demo.rpc.title')"
    :status="translatedStatus"
  >
    <DemoDataGrid :items="items" />
    <UButton type="button" color="primary" variant="soft" @click="emit('checkRpc')">
      {{ $t("demo.rpc.checkAgain") }}
    </UButton>
  </DemoPanel>
</template>
