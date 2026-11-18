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
import { formatError } from "./errors";

const MEMO_PROGRAM_ADDRESS = address("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const DEMO_FEE_PAYER: Address = address("11111111111111111111111111111111");

function buildMemoInstruction(note: string): Instruction {
  return {
    programAddress: MEMO_PROGRAM_ADDRESS,
    accounts: [],
    data: new TextEncoder().encode(note),
  } as Instruction;
}

export function useDemoSimulateTransaction() {
  const { client } = useSolanaClient();
  const simulation = useSolanaSimulateTransaction();

  const simulationError = computed(() => formatError(simulation.error.value));
  const simulationErrText = computed(() => {
    const data = simulation.data.value;

    if (!data) {
      return null;
    }

    return data.err ? JSON.stringify(data.err) : "none";
  });
  const simulationLogsCount = computed(() => simulation.data.value?.logs?.length ?? null);
  const simulationBalanceChangesCount = computed(
    () => simulation.data.value?.balanceChanges?.length ?? null,
  );

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

  return {
    runSimulation,
    simulation,
    simulationBalanceChangesCount,
    simulationErrText,
    simulationError,
    simulationLogsCount,
  };
}
