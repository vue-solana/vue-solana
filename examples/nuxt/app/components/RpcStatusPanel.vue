<script setup lang="ts">
import { computed } from "vue";

const solana = useSolana();
const rpc = useSolanaRpc();

const pluginInstalled = computed(() => Boolean(solana.client && solana.endpoint));
</script>

<template>
  <section class="panel" data-testid="rpc-panel">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">useSolana + useSolanaRpc</p>
        <h2>Module And RPC Status</h2>
      </div>
      <span
        class="status-pill"
        :class="`status-pill--${rpc.status.value}`"
        data-testid="rpc-status"
      >
        {{ rpc.status }}
      </span>
    </div>

    <dl class="data-grid">
      <div>
        <dt>Plugin installed</dt>
        <dd data-testid="plugin-installed">{{ pluginInstalled ? "Yes" : "No" }}</dd>
      </div>
      <div>
        <dt>Cluster</dt>
        <dd data-testid="rpc-cluster">{{ rpc.cluster }}</dd>
      </div>
      <div>
        <dt>RPC endpoint</dt>
        <dd data-testid="rpc-endpoint">{{ rpc.endpoint }}</dd>
      </div>
      <div>
        <dt>WebSocket endpoint</dt>
        <dd>{{ rpc.wsEndpoint }}</dd>
      </div>
      <div>
        <dt>Latest blockhash</dt>
        <dd data-testid="rpc-latest-blockhash">
          {{ rpc.latestBlockhash.value ?? "Not loaded yet" }}
        </dd>
      </div>
      <div v-if="rpc.error.value">
        <dt>RPC error</dt>
        <dd>{{ rpc.error.value }}</dd>
      </div>
    </dl>

    <button type="button" data-testid="check-rpc" @click="rpc.checkConnection">
      Check RPC Again
    </button>
  </section>
</template>
