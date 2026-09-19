<script lang="ts">
// Module-scoped so the counter survives remounts: every actual HTTP attempt
// bumps it, which is what makes the SWR stale-while-revalidate handoff visible.
let swrHit = 0;
</script>

<script setup lang="ts">
import { computed } from "vue";
import { useRequestSwr } from "@vue-solana/vue/swr";

const client = useSolanaClient();

const { data, error, status } = useRequestSwr<{ hit: number; core: string }>(
  "demo:version",
  async (signal) => {
    const hit = ++swrHit;

    await new Promise((resolve) => setTimeout(resolve, 1200));
    const version = await client.rpc.getVersion().send({ abortSignal: signal });

    return { hit, core: version["solana-core"] };
  },
);

const errorText = computed(() => (error.value instanceof Error ? error.value.message : ""));
</script>

<template>
  <div>
    <div class="flex items-center justify-between gap-3">
      <p class="text-base font-bold [overflow-wrap:anywhere] text-slate-950 dark:text-white">
        {{ data ? `Request #${data.hit} · solana-core ${data.core}` : $t("demo.liveData.noData") }}
      </p>
      <UBadge
        :color="status === 'error' ? 'error' : status === 'success' ? 'success' : 'warning'"
        variant="subtle"
        class="uppercase"
      >
        {{ status }}
      </UBadge>
    </div>
    <UAlert v-if="errorText" color="error" variant="subtle" class="mt-3" :title="errorText" />
  </div>
</template>
