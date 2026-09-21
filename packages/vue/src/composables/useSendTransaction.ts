import type {
  InstructionPlanInput,
  SingleTransactionPlan,
  SuccessfulSingleTransactionPlanResult,
  TransactionPlanInput,
  TransactionPlanResult,
} from "@vue-solana/core/kit";
import { normalizeSolanaError, type SolanaError } from "@vue-solana/core/errors";
import { onScopeDispose, ref, shallowRef } from "vue";
import { useClientCapability } from "./useClientCapability";
import { useSolanaClient } from "./useSolanaClient";

export type SendTransactionStatus = "idle" | "sending" | "sent" | "error";

export interface SendTransactionConfig {
  abortSignal?: AbortSignal;
}

export type SendTransactionInput =
  | InstructionPlanInput
  | SingleTransactionPlan
  | SingleTransactionPlan["message"];

export type SendTransactionsInput = InstructionPlanInput | TransactionPlanInput;

interface SendingClient {
  sendTransaction: (
    input: SendTransactionInput,
    config?: SendTransactionConfig,
  ) => Promise<SuccessfulSingleTransactionPlanResult>;
  sendTransactions: (
    input: SendTransactionsInput,
    config?: SendTransactionConfig,
  ) => Promise<TransactionPlanResult>;
}

const SENDING_PROVIDER_HINT =
  "Install a transaction planner and a transaction-sending executor plugin, e.g. " +
  "`createClient().use(rpcTransactionPlanner()).use(rpcTransactionPlanSendingExecutor())` " +
  "from `@solana/kit-plugin-rpc`.";

/**
 * Plan, sign with the client's signers (payer/identity), submit, and confirm
 * a single transaction — all through the client's transaction-sending
 * capability (`ClientWithTransactionSending`), with no wallet popup.
 *
 * Accepts flexible input: instructions, an instruction plan, a transaction
 * message, or a single transaction plan.
 *
 * Rejects with a clear capability error when the client cannot send.
 *
 * Calling `execute` while a prior execution is in flight aborts the prior call;
 * the superseded attempt rejects, so check its `error.cause` to tell it apart
 * from a real failure.
 */
export function useSendTransaction() {
  useClientCapability(["sendTransaction"], {
    hookName: "useSendTransaction",
    providerHint: SENDING_PROVIDER_HINT,
  });

  const { client } = useSolanaClient();
  const data = shallowRef<SuccessfulSingleTransactionPlanResult | null>(null);
  const status = ref<SendTransactionStatus>("idle");
  const loading = ref(false);
  const error = ref<SolanaError | null>(null);
  let executionId = 0;
  let abortController: AbortController | undefined;

  onScopeDispose(() => {
    abortController?.abort();
    executionId++;
  });

  async function execute(
    input: SendTransactionInput,
    config?: SendTransactionConfig,
  ): Promise<SuccessfulSingleTransactionPlanResult> {
    abortController?.abort();
    const controller = new AbortController();
    abortController = controller;
    const currentExecutionId = ++executionId;
    const sender = client as unknown as SendingClient;

    status.value = "sending";
    loading.value = true;
    error.value = null;
    data.value = null;

    try {
      const abortSignal = config?.abortSignal
        ? AbortSignal.any([controller.signal, config.abortSignal])
        : controller.signal;
      const result = await sender.sendTransaction(input, { abortSignal });

      if (currentExecutionId === executionId) {
        data.value = result;
        status.value = "sent";
      }

      return result;
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
    data,
    status,
    loading,
    error,
    execute,
  };
}

/**
 * Plan, sign, submit, and confirm one or more transactions — possibly a batch
 * of messages, executed in parallel or sequentially as the plan dictates —
 * through the client's transaction-sending capability.
 */
export function useSendTransactions() {
  useClientCapability(["sendTransactions"], {
    hookName: "useSendTransactions",
    providerHint: SENDING_PROVIDER_HINT,
  });

  const { client } = useSolanaClient();
  const data = shallowRef<TransactionPlanResult | null>(null);
  const status = ref<SendTransactionStatus>("idle");
  const loading = ref(false);
  const error = ref<SolanaError | null>(null);
  let executionId = 0;
  let abortController: AbortController | undefined;

  onScopeDispose(() => {
    abortController?.abort();
    executionId++;
  });

  async function execute(
    input: SendTransactionsInput,
    config?: SendTransactionConfig,
  ): Promise<TransactionPlanResult> {
    abortController?.abort();
    const controller = new AbortController();
    abortController = controller;
    const currentExecutionId = ++executionId;
    const sender = client as unknown as SendingClient;

    status.value = "sending";
    loading.value = true;
    error.value = null;
    data.value = null;

    try {
      const abortSignal = config?.abortSignal
        ? AbortSignal.any([controller.signal, config.abortSignal])
        : controller.signal;
      const result = await sender.sendTransactions(input, { abortSignal });

      if (currentExecutionId === executionId) {
        data.value = result;
        status.value = "sent";
      }

      return result;
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
    data,
    status,
    loading,
    error,
    execute,
  };
}
