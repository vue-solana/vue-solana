<script setup lang="ts">
import { computed } from "vue";
import { useTransactionHistory, useWallet } from "@vue-solana/vue";
import { formatError } from "../../format-error";

const PLACEHOLDER_ADDRESS = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin";

const wallet = useWallet();
const address = computed(() => wallet.publicKey.value ?? PLACEHOLDER_ADDRESS);
const history = useTransactionHistory(address, { limit: 1 });

const historyError = computed(() => formatError(history.error.value));
const historySummary = computed(() => {
  const count = history.items.value.length;

  if (count === 0) {
    return history.loading.value ? "Loading..." : "No transactions yet";
  }

  return `${count} transaction${count === 1 ? "" : "s"} loaded`;
});

async function run(task: () => Promise<unknown>) {
  try {
    await task();
  } catch {
    // The composable exposes the normalized error in `history.error`.
  }
}
</script>

<template>
  <section class="panel" data-testid="history-panel">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">useTransactionHistory</p>
        <h2>Transaction History</h2>
      </div>
      <span class="status-pill" :class="`status-pill--${history.status.value}`">
        {{ history.status.value }}
      </span>
    </div>

    <p>
      Lists the newest signature metadata for the connected wallet, or a placeholder address when no
      wallet is connected. No transaction bodies are fetched.
    </p>

    <dl class="data-grid compact-grid">
      <div>
        <dt>Address</dt>
        <dd class="truncate" data-testid="history-source">{{ address }}</dd>
      </div>
      <div>
        <dt>Status</dt>
        <dd data-testid="history-status">{{ history.status.value }}</dd>
      </div>
      <div>
        <dt>Result</dt>
        <dd data-testid="history-empty">{{ historySummary }}</dd>
      </div>
    </dl>

    <ul v-if="history.items.value.length" class="signature-list" data-testid="history-list">
      <li v-for="item in history.items.value" :key="item.signature" data-testid="history-item">
        <code>{{ item.signature }}</code>
        <span>slot {{ item.slot }} · {{ item.err ? "failed" : "success" }}</span>
      </li>
    </ul>

    <div class="actions">
      <button type="button" data-testid="history-refresh" @click="run(history.refresh)">
        Refresh
      </button>
      <button
        type="button"
        data-testid="history-load-more"
        :disabled="!history.hasMore.value || history.loading.value || history.loadingMore.value"
        @click="run(history.loadMore)"
      >
        {{ history.loadingMore.value ? "Loading..." : "Load older" }}
      </button>
    </div>

    <p v-if="historyError" class="error" data-testid="history-error">{{ historyError }}</p>
  </section>
</template>

<style scoped>
.truncate {
  max-width: 18rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.signature-list {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.signature-list li {
  display: grid;
  gap: 0.25rem;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
}

.signature-list code {
  overflow-wrap: anywhere;
}

.signature-list span {
  font-size: 0.85rem;
  opacity: 0.7;
}
</style>
