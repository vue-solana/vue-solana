<script setup lang="ts">
import { computed, ref } from "vue";

const balanceAddress = ref("11111111111111111111111111111111");

const balance = useSolanaBalance(balanceAddress);

const balanceInSol = computed(() => {
  if (balance.balance.value === null) {
    return "No balance loaded";
  }

  return `${balance.balance.value / 1_000_000_000} SOL`;
});
const balanceError = computed(() => formatError(balance.error.value));
</script>

<template>
  <section class="panel" data-testid="balance-panel">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">useSolanaBalance</p>
        <h2>Balance Lookup</h2>
      </div>
    </div>

    <label>
      Public key
      <input
        v-model="balanceAddress"
        data-testid="balance-address"
        placeholder="Enter a Solana public key"
      />
    </label>
    <div class="actions">
      <button
        type="button"
        data-testid="refresh-balance"
        :disabled="balance.loading.value"
        @click="balance.refresh"
      >
        {{ balance.loading.value ? "Loading..." : "Refresh Balance" }}
      </button>
    </div>
    <p class="result" data-testid="balance-lamports">
      Lamports: {{ balance.balance.value ?? "No balance loaded" }}
    </p>
    <p class="result" data-testid="balance-sol">SOL: {{ balanceInSol }}</p>
    <p v-if="balanceError" class="error">{{ balanceError }}</p>
    <p class="hint">
      <code>refresh()</code> rejects on failure, so wire it to an event like above or catch it. When
      a read fails, <code>balance</code> drops back to <code>null</code> instead of leaving the last
      value next to the error — that is why the line above reads "No balance loaded" while an error
      is shown.
    </p>
  </section>
</template>
