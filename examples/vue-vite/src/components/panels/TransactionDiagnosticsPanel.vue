<script setup lang="ts">
import { computed } from "vue";
import {
  address,
  appendTransactionMessageInstruction,
  compileTransaction,
  createTransactionMessage,
  getTransactionEncoder,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
  type Instruction,
} from "@vue-solana/vue/kit";
import { useSimulateTransaction } from "@vue-solana/vue/useSimulateTransaction";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";
import { useTransactionDiagnostics } from "@vue-solana/vue/useTransactionDiagnostics";
import { useTransactionHistory } from "@vue-solana/vue/useTransactionHistory";
import { useWallet } from "@vue-solana/vue/useWallet";
import { formatError } from "../../format-error";

const { client } = useSolanaClient();
const wallet = useWallet();
const history = useTransactionHistory(
  computed(() => wallet.publicKey.value ?? "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin"),
  { limit: 1 },
);
const simulation = useSimulateTransaction();

const MEMO_PROGRAM_ADDRESS = address("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const DEMO_FEE_PAYER: Address = address("dv3qDFk1DTF36Z62bNvrCXe9sKATA6xvVy6A798xxAS");

const labels = { [MEMO_PROGRAM_ADDRESS]: "Memo app" };
const failedItem = computed(() => history.items.value.find((item) => item.err !== null) ?? null);
const diagnostics = useTransactionDiagnostics(failedItem, {
  simulationResult: computed(() => simulation.data.value),
  error: simulation.error,
  labels,
});

const report = computed(() => diagnostics.report.value);
const summary = computed(() => report.value?.summary ?? "No report yet");
const code = computed(() => report.value?.code ?? "—");
const details = computed(() => {
  const value = report.value;

  if (!value) {
    return "No diagnostic data yet";
  }

  const programs = value.programs.map((program) => program.label ?? program.address).join(", ");

  return [
    `units: ${value.unitsConsumed ?? "—"}`,
    `logs: ${value.logs.length}`,
    `balance changes: ${value.balanceChanges.length}`,
    `programs: ${programs || "—"}`,
    `sources: ${value.sources.join(", ") || "—"}`,
  ].join(" · ");
});
const errorText = computed(() => {
  const error = formatError(diagnostics.error.value);

  if (error) {
    return error;
  }

  const value = report.value;

  return value?.outcome === "failed" ? `${value.code}: ${value.summary}` : null;
});

function buildMemoInstruction(note: string): Instruction {
  return {
    programAddress: MEMO_PROGRAM_ADDRESS,
    accounts: [],
    data: new TextEncoder().encode(note),
  } as Instruction;
}

async function runDiagnostics() {
  try {
    await history.refresh();
  } catch {
    // The composable exposes the normalized error in `history.error`.
  }

  const { value: latestBlockhash } = await client.rpc.getLatestBlockhash().send();
  const message = appendTransactionMessageInstruction(
    buildMemoInstruction("Hello from @vue-solana diagnostics"),
    setTransactionMessageLifetimeUsingBlockhash(
      latestBlockhash,
      setTransactionMessageFeePayer(DEMO_FEE_PAYER, createTransactionMessage({ version: 0 })),
    ),
  );

  try {
    await simulation.execute(
      new Uint8Array(getTransactionEncoder().encode(compileTransaction(message))),
      { sigVerify: false },
    );
  } catch {
    // The composable exposes the normalized error in `simulation.error`.
  }

  await diagnostics.refresh();
}
</script>

<template>
  <section class="panel" data-testid="diagnostics-panel">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">useTransactionDiagnostics</p>
        <h2>Transaction Diagnostics</h2>
      </div>
      <span class="status-pill" :class="`status-pill--${diagnostics.status.value}`">
        {{ diagnostics.status.value }}
      </span>
    </div>

    <p>
      Starts from a failed history item, simulates a demo memo transaction, and joins both with an
      app-supplied program label. The report is pure: it never fetches a transaction body, decodes
      instructions, or retries.
    </p>

    <dl class="data-grid compact-grid">
      <div>
        <dt>Status</dt>
        <dd data-testid="diagnostics-status">{{ diagnostics.status.value }}</dd>
      </div>
      <div>
        <dt>Code</dt>
        <dd data-testid="diagnostics-code">{{ code }}</dd>
      </div>
    </dl>

    <div class="actions">
      <button
        type="button"
        data-testid="diagnostics-button"
        :disabled="diagnostics.loading.value || simulation.loading.value"
        @click="runDiagnostics"
      >
        {{ diagnostics.loading.value ? "Building report..." : "Diagnose Failed Transaction" }}
      </button>
    </div>

    <p class="result" data-testid="diagnostics-summary">{{ summary }}</p>
    <p class="result" data-testid="diagnostics-details">{{ details }}</p>
    <ul
      v-if="report?.suggestions.length"
      class="signature-list"
      data-testid="diagnostics-suggestions"
    >
      <li
        v-for="suggestion in report.suggestions"
        :key="suggestion"
        data-testid="diagnostics-suggestion"
      >
        {{ suggestion }}
      </li>
    </ul>
    <p v-if="errorText" class="error" data-testid="diagnostics-error">{{ errorText }}</p>
  </section>
</template>
