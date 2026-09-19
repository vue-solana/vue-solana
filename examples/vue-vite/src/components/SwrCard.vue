<script lang="ts">
// Module-scoped so the counter survives remounts: every actual HTTP attempt
// bumps it, which is what makes the SWR stale-while-revalidate handoff visible.
let swrHit = 0;
</script>

<script setup lang="ts">
import { computed } from "vue";
import { useSolanaClient } from "@vue-solana/vue";
import { useRequestSwr } from "@vue-solana/vue/swr";

const { client } = useSolanaClient();

const swr = useRequestSwr<{ hit: number; core: string }>("example:version", async (signal) => {
  const hit = ++swrHit;
  // Simulated latency keeps the stale (cached) value visible long enough to
  // observe the handoff from stale to fresh data.
  await new Promise((resolve) => window.setTimeout(resolve, 1_500));
  const version = await client.rpc.getVersion().send({ abortSignal: signal });

  return { hit, core: version["solana-core"] };
});

const swrText = computed(() => {
  const data = swr.data.value;

  return data ? `Request #${data.hit} · solana-core ${data.core}` : "No data yet";
});
</script>

<template>
  <div class="swr-card">
    <span class="status-pill" data-testid="swr-status">{{ swr.status.value }}</span>
    <p class="result" data-testid="swr-data">{{ swrText }}</p>
  </div>
</template>

<style scoped>
.swr-card {
  margin-top: 0.85rem;
}

.status-pill {
  display: inline-block;
  padding: 0.3rem 0.65rem;
  border: 1px solid hsla(160, 100%, 37%, 0.4);
  border-radius: 999px;
  background: hsla(160, 100%, 37%, 0.12);
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
}

.result {
  margin: 0.85rem 0 0;
  overflow-wrap: anywhere;
}
</style>
