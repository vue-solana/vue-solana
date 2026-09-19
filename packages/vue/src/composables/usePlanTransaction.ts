import type {
  InstructionPlanInput,
  TransactionMessage,
  TransactionPlan,
} from "@vue-solana/core/kit";
import { normalizeSolanaError, type SolanaError } from "@vue-solana/core/errors";
import { ref, shallowRef } from "vue";
import { useClientCapability } from "./useClientCapability";
import { useSolanaClient } from "./useSolanaClient";

export type PlanTransactionStatus = "idle" | "planning" | "planned" | "error";

export interface PlanTransactionConfig {
  abortSignal?: AbortSignal;
}

interface PlanningClient {
  planTransaction: (
    input: InstructionPlanInput,
    config?: PlanTransactionConfig,
  ) => Promise<TransactionMessage>;
  planTransactions: (
    input: InstructionPlanInput,
    config?: PlanTransactionConfig,
  ) => Promise<TransactionPlan>;
}

/**
 * Plan a single transaction message from instruction inputs — without
 * signing or sending — using the client's transaction planning capability
 * (e.g. `rpcTransactionPlanner` from `@solana/kit-plugin-rpc`).
 *
 * Rejects with a clear capability error when the client does not plan.
 */
export function usePlanTransaction() {
  useClientCapability(["planTransaction"], {
    hookName: "usePlanTransaction",
    providerHint:
      "Install a planner plugin, e.g. `createClient().use(rpcTransactionPlanner())` from `@solana/kit-plugin-rpc`.",
  });

  const { client } = useSolanaClient();
  const transactionMessage = shallowRef<TransactionMessage | null>(null);
  const status = ref<PlanTransactionStatus>("idle");
  const loading = ref(false);
  const error = ref<SolanaError | null>(null);
  let executionId = 0;

  async function execute(
    input: InstructionPlanInput,
    config?: PlanTransactionConfig,
  ): Promise<TransactionMessage> {
    const currentExecutionId = ++executionId;
    const planner = client as unknown as PlanningClient;

    status.value = "planning";
    loading.value = true;
    error.value = null;
    transactionMessage.value = null;

    try {
      const message = await planner.planTransaction(input, config);

      if (currentExecutionId === executionId) {
        transactionMessage.value = message;
        status.value = "planned";
      }

      return message;
    } catch (cause) {
      const normalizedError = normalizeSolanaError(cause, "RPC_FAILURE");

      if (currentExecutionId === executionId) {
        error.value = normalizedError;
        status.value = "error";
      }

      throw normalizedError;
    } finally {
      if (currentExecutionId === executionId) {
        loading.value = false;
      }
    }
  }

  return {
    transactionMessage,
    status,
    loading,
    error,
    execute,
  };
}

/**
 * Plan a full transaction plan — possibly multiple transaction messages —
 * from instruction inputs, using the client's transaction planning
 * capability.
 */
export function usePlanTransactions() {
  useClientCapability(["planTransactions"], {
    hookName: "usePlanTransactions",
    providerHint:
      "Install a planner plugin, e.g. `createClient().use(rpcTransactionPlanner())` from `@solana/kit-plugin-rpc`.",
  });

  const { client } = useSolanaClient();
  const transactionPlan = shallowRef<TransactionPlan | null>(null);
  const status = ref<PlanTransactionStatus>("idle");
  const loading = ref(false);
  const error = ref<SolanaError | null>(null);
  let executionId = 0;

  async function execute(
    input: InstructionPlanInput,
    config?: PlanTransactionConfig,
  ): Promise<TransactionPlan> {
    const currentExecutionId = ++executionId;
    const planner = client as unknown as PlanningClient;

    status.value = "planning";
    loading.value = true;
    error.value = null;
    transactionPlan.value = null;

    try {
      const plan = await planner.planTransactions(input, config);

      if (currentExecutionId === executionId) {
        transactionPlan.value = plan;
        status.value = "planned";
      }

      return plan;
    } catch (cause) {
      const normalizedError = normalizeSolanaError(cause, "RPC_FAILURE");

      if (currentExecutionId === executionId) {
        error.value = normalizedError;
        status.value = "error";
      }

      throw normalizedError;
    } finally {
      if (currentExecutionId === executionId) {
        loading.value = false;
      }
    }
  }

  return {
    transactionPlan,
    status,
    loading,
    error,
    execute,
  };
}
