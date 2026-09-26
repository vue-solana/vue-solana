import type {
  InstructionPlanInput,
  TransactionMessage,
  TransactionPlan,
} from "@vue-solana/core/kit";
import { normalizeSolanaError, type SolanaError } from "@vue-solana/core/errors";
import { onScopeDispose, ref, shallowRef } from "vue";
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

const PLANNING_PROVIDER_HINT =
  "Install a planner plugin, e.g. `createClient().use(rpcTransactionPlanner())` from " +
  "`@solana/kit-plugin-rpc`, and plan with a client that has a `payer` signer — " +
  "Kit reads `client.payer` to set the fee payer.";

/**
 * Plan a single transaction message from instruction inputs — without
 * signing or sending — using the client's transaction planning capability
 * (e.g. `rpcTransactionPlanner` from `@solana/kit-plugin-rpc`).
 *
 * Throws with a clear capability error when the client does not plan, which
 * includes a client without a `payer` signer.
 *
 * Calling `execute` while a prior execution is in flight aborts the prior call;
 * the superseded attempt rejects, so check its `error.cause` to tell it apart
 * from a real failure.
 */
export function usePlanTransaction() {
  useClientCapability(["planTransaction", "payer"], {
    hookName: "usePlanTransaction",
    providerHint: PLANNING_PROVIDER_HINT,
  });

  const { client } = useSolanaClient();
  const transactionMessage = shallowRef<TransactionMessage | null>(null);
  const status = ref<PlanTransactionStatus>("idle");
  const loading = ref(false);
  const error = ref<SolanaError | null>(null);
  let executionId = 0;
  let abortController: AbortController | undefined;

  onScopeDispose(() => {
    abortController?.abort();
    executionId++;
  });

  async function execute(
    input: InstructionPlanInput,
    config?: PlanTransactionConfig,
  ): Promise<TransactionMessage> {
    abortController?.abort();
    const controller = new AbortController();
    abortController = controller;
    const currentExecutionId = ++executionId;
    const planner = client as unknown as PlanningClient;

    status.value = "planning";
    loading.value = true;
    error.value = null;
    transactionMessage.value = null;

    try {
      const abortSignal = config?.abortSignal
        ? AbortSignal.any([controller.signal, config.abortSignal])
        : controller.signal;
      const message = await planner.planTransaction(input, { abortSignal });

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
 *
 * Throws with a clear capability error when the client does not plan, which
 * includes a client without a `payer` signer.
 */
export function usePlanTransactions() {
  useClientCapability(["planTransactions", "payer"], {
    hookName: "usePlanTransactions",
    providerHint: PLANNING_PROVIDER_HINT,
  });

  const { client } = useSolanaClient();
  const transactionPlan = shallowRef<TransactionPlan | null>(null);
  const status = ref<PlanTransactionStatus>("idle");
  const loading = ref(false);
  const error = ref<SolanaError | null>(null);
  let executionId = 0;
  let abortController: AbortController | undefined;

  onScopeDispose(() => {
    abortController?.abort();
    executionId++;
  });

  async function execute(
    input: InstructionPlanInput,
    config?: PlanTransactionConfig,
  ): Promise<TransactionPlan> {
    abortController?.abort();
    const controller = new AbortController();
    abortController = controller;
    const currentExecutionId = ++executionId;
    const planner = client as unknown as PlanningClient;

    status.value = "planning";
    loading.value = true;
    error.value = null;
    transactionPlan.value = null;

    try {
      const abortSignal = config?.abortSignal
        ? AbortSignal.any([controller.signal, config.abortSignal])
        : controller.signal;
      const plan = await planner.planTransactions(input, { abortSignal });

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
