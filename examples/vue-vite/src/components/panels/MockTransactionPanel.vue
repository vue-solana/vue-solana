<script setup lang="ts">
import { computed } from "vue";
import { useTransaction } from "@vue-solana/vue";
import { formatError } from "../../format-error";

const mockTransaction = useTransaction(async (label: string) => {
  await new Promise((resolve) => window.setTimeout(resolve, 350));
  return `mock-${label}-${Date.now()}`;
});

const mockTransactionError = computed(() => formatError(mockTransaction.error.value));

async function runMockTransaction() {
  await mockTransaction.execute("transaction");
}
</script>

<template>
  <section class="panel" data-testid="transaction-panel">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">useTransaction</p>
        <h2>Generic Transaction State</h2>
      </div>
    </div>

    <p>Runs a mock async handler to test loading, error, and signature state.</p>
    <button
      type="button"
      data-testid="run-mock-transaction"
      :disabled="mockTransaction.loading.value"
      @click="runMockTransaction"
    >
      {{ mockTransaction.loading.value ? "Running..." : "Run Mock Transaction" }}
    </button>
    <p class="result" data-testid="mock-transaction-signature">
      Signature: {{ mockTransaction.signature.value ?? "No signature yet" }}
    </p>
    <p v-if="mockTransactionError" class="error">{{ mockTransactionError }}</p>
  </section>
</template>
