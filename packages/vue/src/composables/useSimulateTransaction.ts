import type { SolanaError } from "@vue-solana/core/errors";
import { simulateTransaction } from "@vue-solana/core/transaction";
import type {
  SimulateTransactionOptions,
  SimulatedTransactionResult,
  SolanaTransaction,
} from "@vue-solana/core/types";
import { onScopeDispose, shallowRef, type ComputedRef, type Ref, type ShallowRef } from "vue";
import { MissingClientCapabilityError } from "./useClientCapability";
import { useExecution } from "./use-execution";
import { useSolanaClient } from "./useSolanaClient";

export type SimulationStatus = "idle" | "simulating" | "simulated" | "error";

export type UseSimulateTransactionOptions = SimulateTransactionOptions;

export interface UseSimulateTransaction {
  data: ShallowRef<SimulatedTransactionResult | null>;
  error: Ref<SolanaError | null>;
  execute: (
    transaction: SolanaTransaction,
    options?: UseSimulateTransactionOptions,
  ) => Promise<SimulatedTransactionResult>;
  loading: ComputedRef<boolean>;
  reset: () => void;
  status: ShallowRef<SimulationStatus>;
}

const SIMULATION_STATUSES = {
  error: "error",
  idle: "idle",
  success: "simulated",
  working: "simulating",
} as const satisfies Record<string, SimulationStatus>;

const PROVIDER_HINT =
  "Use a client created by `createSolanaClient()`, whose RPC exposes Kit's standard `simulateTransaction` method.";

/**
 * Simulate raw wire transaction bytes without submitting them.
 *
 * Uses the shared supersede-and-report state machine: starting a new
 * execution aborts and ignores the previous one. A non-null `err` in the
 * result is simulation data, not a thrown error.
 */
export function useSimulateTransaction(): UseSimulateTransaction {
  const { client } = useSolanaClient();

  if (typeof client.rpc?.simulateTransaction !== "function") {
    throw new MissingClientCapabilityError(
      "useSimulateTransaction",
      ["rpc.simulateTransaction"],
      PROVIDER_HINT,
    );
  }

  const data = shallowRef<SimulatedTransactionResult | null>(null);
  let abortController: AbortController | undefined;

  onScopeDispose(() => abortController?.abort());

  const execution = useExecution<SimulationStatus>(SIMULATION_STATUSES.working, {
    error: SIMULATION_STATUSES.error,
    idle: SIMULATION_STATUSES.idle,
  });

  async function execute(
    transaction: SolanaTransaction,
    options: UseSimulateTransactionOptions = {},
  ): Promise<SimulatedTransactionResult> {
    abortController?.abort();

    const controller = new AbortController();
    abortController = controller;
    data.value = null;

    const abortSignal = options.abortSignal
      ? AbortSignal.any([controller.signal, options.abortSignal])
      : controller.signal;

    return execution.execute(
      () => simulateTransaction(client, transaction, { ...options, abortSignal }),
      (result) => {
        data.value = result;

        return SIMULATION_STATUSES.success;
      },
    );
  }

  function reset() {
    // Invalidate stale executions before aborting them so their rejection
    // cannot write state after the reset.
    execution.reset();
    abortController?.abort();
    abortController = undefined;
    data.value = null;
  }

  return {
    data,
    error: execution.error,
    execute,
    loading: execution.loading,
    reset,
    status: execution.status,
  };
}
