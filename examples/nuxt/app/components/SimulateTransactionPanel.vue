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
} from "@vue-solana/nuxt/kit";

const { client } = useSolanaClient();
const simulation = useSolanaSimulateTransaction();

const MEMO_PROGRAM_ADDRESS = address("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const DEMO_FEE_PAYER: Address = address("11111111111111111111111111111111");

const simulationError = computed(() => formatError(simulation.error.value));
const simulationResultText = computed(() => {
  const data = simulation.data.value;

  if (!data) {
    return "No simulation yet";
  }

  const errText = data.err ? JSON.stringify(data.err) : "none";
  const logsText = data.logs ? `${data.logs.length} log(s)` : "none";

  return `err: ${errText} · fee: ${data.fee ?? "n/a"} lamports · units: ${data.unitsConsumed ?? "n/a"} · logs: ${logsText}`;
});

function buildMemoInstruction(note: string): Instruction {
  return {
    programAddress: MEMO_PROGRAM_ADDRESS,
    accounts: [],
    data: new TextEncoder().encode(note),
  } as Instruction;
}

async function runSimulation() {
  const { value: latestBlockhash } = await client.rpc.getLatestBlockhash().send();
  const transactionMessage = appendTransactionMessageInstruction(
    buildMemoInstruction("Hello from @vue-solana simulation"),
    setTransactionMessageLifetimeUsingBlockhash(
      latestBlockhash,
      setTransactionMessageFeePayer(DEMO_FEE_PAYER, createTransactionMessage({ version: 0 })),
    ),
  );
  const transaction = new Uint8Array(
    getTransactionEncoder().encode(compileTransaction(transactionMessage)),
  );

  await simulation.execute(transaction, { sigVerify: false });
}
</script>

<template>
  <section class="panel" data-testid="simulate-panel">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">useSolanaSimulateTransaction</p>
        <h2>Simulate Transaction</h2>
      </div>
      <span class="status-pill" :class="`status-pill--${simulation.status.value}`">
        {{ simulation.status.value }}
      </span>
    </div>

    <p>
      Previews a demo memo transaction without submitting it, spending SOL, or requiring a wallet or
      client payer.
    </p>

    <dl class="data-grid compact-grid">
      <div>
        <dt>Status</dt>
        <dd data-testid="simulate-status">{{ simulation.status.value }}</dd>
      </div>
      <div>
        <dt>Program error</dt>
        <dd data-testid="simulate-err">
          {{
            simulation.data.value
              ? simulation.data.value.err
                ? JSON.stringify(simulation.data.value.err)
                : "none"
              : "—"
          }}
        </dd>
      </div>
      <div>
        <dt>Fee (lamports)</dt>
        <dd data-testid="simulate-fee">{{ simulation.data.value?.fee ?? "—" }}</dd>
      </div>
      <div>
        <dt>Units consumed</dt>
        <dd data-testid="simulate-units">{{ simulation.data.value?.unitsConsumed ?? "—" }}</dd>
      </div>
    </dl>

    <div class="actions">
      <button
        type="button"
        data-testid="simulate-button"
        :disabled="simulation.loading.value"
        @click="runSimulation"
      >
        {{ simulation.loading.value ? "Simulating..." : "Simulate Transaction" }}
      </button>
    </div>

    <p class="result" data-testid="simulate-result">{{ simulationResultText }}</p>
    <p v-if="simulationError" class="error" data-testid="simulate-error">{{ simulationError }}</p>
  </section>
</template>
