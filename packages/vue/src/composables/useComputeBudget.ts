import type { SolanaError } from "@vue-solana/core/errors";
import { resolveFeePolicy } from "@vue-solana/core/fee-policy";
import type { TransactionMessage } from "@vue-solana/core/kit";
import type {
  FeeBudget,
  FeePolicy,
  FeePolicySimulation,
  ResolveFeePolicyResult,
} from "@vue-solana/core/types";
import {
  getCurrentInstance,
  onMounted,
  onScopeDispose,
  shallowRef,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
  type ShallowRef,
} from "vue";
import { MissingClientCapabilityError } from "./useClientCapability";
import { useExecution } from "./use-execution";
import { useSolanaClient } from "./useSolanaClient";

export type ComputeBudgetStatus = "idle" | "computing" | "computed" | "error";

export interface UseComputeBudgetOptions {
  /** Simulation output to derive the budget from, when already available. */
  simulationResult?: MaybeRefOrGetter<FeePolicySimulation | null | undefined>;
  /** Resolve once after mount, in addition to source changes. Defaults to `false`. */
  immediate?: boolean;
  /** Extra cancellation source composed with supersede and scope disposal. */
  abortSignal?: MaybeRefOrGetter<AbortSignal | undefined>;
}

export interface UseComputeBudget<TMessage extends TransactionMessage = TransactionMessage> {
  /** The last resolved budget, kept while a newer resolution is in flight. */
  budget: ShallowRef<FeeBudget | null>;
  /** The message with the policy applied, kept alongside `budget`. */
  message: ShallowRef<TMessage | null>;
  status: ShallowRef<ComputeBudgetStatus>;
  error: Ref<SolanaError | null>;
  loading: ComputedRef<boolean>;
  /** Resolve the current sources, superseding any in-flight resolution. */
  apply: () => Promise<ResolveFeePolicyResult<TMessage> | null>;
  /** Alias for `apply()`, for apps that treat this as a refreshable read. */
  refresh: () => Promise<ResolveFeePolicyResult<TMessage> | null>;
  reset: () => void;
}

const COMPUTE_BUDGET_STATUSES = {
  error: "error",
  idle: "idle",
  success: "computed",
  working: "computing",
} as const satisfies Record<string, ComputeBudgetStatus>;

const PROVIDER_HINT =
  "Use a client created by `createSolanaClient()`, whose RPC exposes Kit's standard `simulateTransaction` method, or pass a simulation result.";

/**
 * Resolve a fee policy against a reactive transaction message without signing
 * or sending it. Source changes supersede the previous resolution, and scope
 * disposal aborts an in-flight RPC estimation.
 *
 * When no simulation result is supplied, the client's `rpc.simulateTransaction`
 * method is used for Kit's resource-limit estimate; that capability is checked
 * at setup so a misconfigured client fails before any work starts.
 */
export function useComputeBudget<TMessage extends TransactionMessage = TransactionMessage>(
  messageSource: MaybeRefOrGetter<TMessage | null | undefined>,
  policySource: MaybeRefOrGetter<FeePolicy> = {},
  options: UseComputeBudgetOptions = {},
): UseComputeBudget<TMessage> {
  const { client } = useSolanaClient();

  if (
    options.simulationResult === undefined &&
    typeof client.rpc?.simulateTransaction !== "function"
  ) {
    throw new MissingClientCapabilityError(
      "useComputeBudget",
      ["rpc.simulateTransaction"],
      PROVIDER_HINT,
    );
  }

  const budget: ShallowRef<FeeBudget | null> = shallowRef(null);
  const message: ShallowRef<TMessage | null> = shallowRef(null);
  let abortController: AbortController | undefined;

  const execution = useExecution<ComputeBudgetStatus>(
    COMPUTE_BUDGET_STATUSES.working,
    COMPUTE_BUDGET_STATUSES,
  );

  async function apply(): Promise<ResolveFeePolicyResult<TMessage> | null> {
    const currentMessage = toValue(messageSource);

    if (!currentMessage) {
      reset();
      return null;
    }

    abortController?.abort();
    const controller = new AbortController();
    abortController = controller;

    const externalSignal = options.abortSignal ? toValue(options.abortSignal) : undefined;
    const abortSignal = externalSignal
      ? AbortSignal.any([controller.signal, externalSignal])
      : controller.signal;
    const simulationResult = options.simulationResult
      ? toValue(options.simulationResult)
      : undefined;

    return execution.execute(
      () =>
        resolveFeePolicy(currentMessage, toValue(policySource), {
          simulationResult: simulationResult ?? undefined,
          client,
          abortSignal,
        }),
      (result) => {
        budget.value = result.budget;
        message.value = result.message;
        return COMPUTE_BUDGET_STATUSES.success;
      },
    );
  }

  function reset() {
    execution.reset();
    abortController?.abort();
    abortController = undefined;
    budget.value = null;
    message.value = null;
  }

  watch(
    [
      () => toValue(messageSource),
      () => toValue(policySource),
      () => (options.simulationResult ? toValue(options.simulationResult) : undefined),
    ],
    () => {
      void apply().catch(() => undefined);
    },
  );

  // SSR must stay inert: the composable only resolves after mount or when an
  // app explicitly calls apply()/refresh(). A component-less effect scope uses
  // the direct fallback because it has no mounted lifecycle.
  if (getCurrentInstance()) {
    onMounted(() => {
      if (options.immediate) {
        void apply().catch(() => undefined);
      }
    });
  } else if (options.immediate) {
    void apply().catch(() => undefined);
  }

  onScopeDispose(() => {
    abortController?.abort();
    abortController = undefined;
  });

  return {
    apply,
    budget,
    error: execution.error,
    loading: execution.loading,
    message,
    refresh: apply,
    reset,
    status: execution.status,
  };
}

/** Discovery alias: a fee policy is resolved into a compute budget. */
export const useFeePolicy = useComputeBudget;
