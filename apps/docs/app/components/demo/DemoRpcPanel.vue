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

const items = computed(() => [
  { label: "Plugin installed", value: props.pluginInstalled ? "Yes" : "No" },
  { label: "Cluster", value: props.cluster },
  { label: "RPC endpoint", value: props.endpoint },
  { label: "WebSocket endpoint", value: props.wsEndpoint },
  { label: "Latest blockhash", value: props.latestBlockhash },
  ...(props.error ? [{ label: "RPC error", value: props.error }] : []),
]);
</script>

<template>
  <DemoPanel eyebrow="useSolana + useSolanaRpc" title="Module And RPC Status" :status="status">
    <DemoDataGrid :items="items" />
    <UButton type="button" color="primary" variant="soft" @click="emit('checkRpc')">
      Check RPC Again
    </UButton>
  </DemoPanel>
</template>
