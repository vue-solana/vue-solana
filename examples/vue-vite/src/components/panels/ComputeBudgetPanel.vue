<script setup lang="ts">
import { computed, ref } from "vue";
import {
  address,
  appendTransactionMessageInstruction,
  compileTransaction,
  createTransactionMessage,
  getTransactionEncoder,
  getTransactionMessageComputeUnitLimit,
  getTransactionMessageComputeUnitPrice,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
  type Instruction,
  type TransactionMessage,
} from "@vue-solana/vue/kit";
import { useComputeBudget } from "@vue-solana/vue/useComputeBudget";
import { useSimulateTransaction } from "@vue-solana/vue/useSimulateTransaction";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";
import { formatError } from "../../format-error";

const { client } = useSolanaClient();
const simulation = useSimulateTransaction();

const MEMO_PROGRAM_ADDRESS = address("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const DEMO_FEE_PAYER: Address = address("dv3qDFk1DTF36Z62bNvrCXe9sKATA6xvVy6A798xxAS");

const message = ref<TransactionMessage | null>(null);
const simulationResult = computed(() => simulation.data.value);
const budget = useComputeBudget(
  message,
  { mode: "standard", computeUnitBufferPercent: 20, maxLamports: 10_000n },
  { simulationResult },
);

const simulationError = computed(() => formatError(simulation.error.value));
const budgetError = computed(() => formatError(budget.error.value));

const budgetText = computed(() => {
  const value = budget.budget.value;

  if (!value) {
    return "No budget yet";
  }

  const capped = value.capped ? value.cappedBy.join(", ") || "yes" : "no";

  return `limit: ${value.computeUnitLimit} · price: ${value.computeUnitPriceMicroLamports} µlamports/CU · estimated fee: ${value.estimatedFeeLamports} lamports · capped: ${capped}`;
});

const appliedMessageText = computed(() => {
  const applied = budget.message.value;

  if (!applied) {
    return "No message yet";
  }

  const limit = getTransactionMessageComputeUnitLimit(applied);
  const price = getTransactionMessageComputeUnitPrice(
    applied as Extract<TransactionMessage, { version: "legacy" | 0 }>,
  );

  return `version: ${applied.version} · limit: ${limit ?? "—"} · price: ${price ?? "—"} µlamports/CU`;
});

function buildMemoInstruction(note: string): Instruction {
  return {
    programAddress: MEMO_PROGRAM_ADDRESS,
    accounts: [],
    data: new TextEncoder().encode(note),
  } as Instruction;
}

async function runBudget() {
  const { value: latestBlockhash } = await client.rpc.getLatestBlockhash().send();
  const transactionMessage = appendTransactionMessageInstruction(
    buildMemoInstruction("Hello from @vue-solana fee policy"),
    setTransactionMessageLifetimeUsingBlockhash(
      latestBlockhash,
      setTransactionMessageFeePayer(DEMO_FEE_PAYER, createTransactionMessage({ version: 0 })),
    ),
  );

  await simulation.execute(
    new Uint8Array(getTransactionEncoder().encode(compileTransaction(transactionMessage))),
    { sigVerify: false },
  );

  // Publish the message only after simulation so the reactive watcher sees the
  // simulation output with it. The explicit apply settles the displayed result.
  message.value = transactionMessage;
  await budget.apply();
}
</script>

<template>
  <section class="panel" data-testid="compute-budget-panel">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">useComputeBudget</p>
        <h2>Compute Budget Policy</h2>
      </div>
      <span class="status-pill" :class="`status-pill--${budget.status.value}`">
        {{ budget.status.value }}
      </span>
    </div>

    <p>
      Simulates a demo memo transaction and applies a capped compute budget to a displayed message.
      It never signs or sends, and every fee value is a local estimate rather than a network
      guarantee.
    </p>

    <dl class="data-grid compact-grid">
      <div>
        <dt>Status</dt>
        <dd data-testid="compute-budget-status">{{ budget.status.value }}</dd>
      </div>
      <div>
        <dt>Simulation status</dt>
        <dd data-testid="compute-budget-simulation-status">{{ simulation.status.value }}</dd>
      </div>
    </dl>

    <div class="actions">
      <button
        type="button"
        data-testid="compute-budget-button"
        :disabled="simulation.loading.value || budget.loading.value"
        @click="runBudget"
      >
        {{ budget.loading.value ? "Applying budget..." : "Simulate and Apply Budget" }}
      </button>
    </div>

    <p class="result" data-testid="compute-budget-result">{{ budgetText }}</p>
    <p class="result" data-testid="compute-budget-message">{{ appliedMessageText }}</p>
    <p v-if="simulationError" class="error" data-testid="compute-budget-simulation-error">
      {{ simulationError }}
    </p>
    <p v-if="budgetError" class="error" data-testid="compute-budget-error">{{ budgetError }}</p>
  </section>
</template>
