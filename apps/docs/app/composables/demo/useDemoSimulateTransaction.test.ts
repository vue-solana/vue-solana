// @vitest-environment node
import { getCompiledTransactionMessageDecoder, getTransactionDecoder } from "@vue-solana/nuxt/kit";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref, shallowRef } from "vue";
import { useDemoSimulateTransaction } from "./useDemoSimulateTransaction";

const MOCK_BLOCKHASH = "5v2p4R5H6J7K8L9M1N2P3Q4R5S6T7U8V9W1X2Y3Z4a5b";
const SYSTEM_PROGRAM_ADDRESS = "11111111111111111111111111111111";
const DEMO_FEE_PAYER_ADDRESS = "dv3qDFk1DTF36Z62bNvrCXe9sKATA6xvVy6A798xxAS";

const execute = vi.fn();
const simulationData = shallowRef<unknown>(null);
const simulationStatus = shallowRef("idle");
const simulationLoading = ref(false);
const simulationError = shallowRef<unknown>(null);
const getLatestBlockhashSend = vi.fn();

vi.stubGlobal("useSolanaClient", () => ({
  client: {
    rpc: {
      getLatestBlockhash: () => ({ send: getLatestBlockhashSend }),
    },
  },
}));

vi.stubGlobal("useSolanaSimulateTransaction", () => ({
  data: simulationData,
  error: simulationError,
  execute,
  loading: simulationLoading,
  status: simulationStatus,
}));

describe("useDemoSimulateTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    simulationData.value = null;
    simulationStatus.value = "idle";
    simulationLoading.value = false;
    simulationError.value = null;
    getLatestBlockhashSend.mockResolvedValue({
      value: { blockhash: MOCK_BLOCKHASH, lastValidBlockHeight: 654321n },
    });
    execute.mockResolvedValue(undefined);
  });

  it("simulates a demo transaction without verifying signatures", async () => {
    const demo = useDemoSimulateTransaction();

    await demo.runSimulation();

    expect(getLatestBlockhashSend).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(expect.any(Uint8Array), { sigVerify: false });

    const transactionBytes = execute.mock.calls[0]?.[0] as Uint8Array;
    const transaction = getTransactionDecoder().decode(transactionBytes);
    const message = getCompiledTransactionMessageDecoder().decode(transaction.messageBytes);
    expect(message.staticAccounts[0]).not.toBe(SYSTEM_PROGRAM_ADDRESS);
    expect(message.staticAccounts[0]).toBe(DEMO_FEE_PAYER_ADDRESS);
  });

  it("exposes formatted simulation results", () => {
    simulationData.value = {
      err: null,
      fee: 5000n,
      logs: ["Program log: hello"],
      unitsConsumed: 150n,
      balanceChanges: [{ accountIndex: 0, before: 1n, after: 1n, change: 0n }],
    };

    const demo = useDemoSimulateTransaction();

    expect(demo.simulationErrText.value).toBe("none");
    expect(demo.simulationLogsCount.value).toBe(1);
    expect(demo.simulationBalanceChangesCount.value).toBe(1);
    expect(demo.simulationError.value).toBeNull();
  });

  it("formats a program error and action errors", () => {
    simulationData.value = {
      err: { InstructionError: [0, "Custom"] },
      fee: 5000n,
      logs: [],
      unitsConsumed: 10n,
      balanceChanges: [],
    };
    simulationError.value = new Error("transport down");

    const demo = useDemoSimulateTransaction();

    expect(demo.simulationErrText.value).toContain("InstructionError");
    expect(demo.simulationError.value).toContain("transport down");
  });
});
