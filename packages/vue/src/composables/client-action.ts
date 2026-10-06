import type { SolanaError } from "@vue-solana/core/errors";
import { onScopeDispose, shallowRef, type ComputedRef, type Ref, type ShallowRef } from "vue";
import { useExecution } from "./use-execution";
import { MissingClientCapabilityError, useClientCapability } from "./useClientCapability";
import { useSolanaClient } from "./useSolanaClient";

export interface ClientActionConfig {
  abortSignal?: AbortSignal;
}

interface ClientActionStatuses<TStatus extends string> {
  error: TStatus;
  idle: TStatus;
  success: TStatus;
  working: TStatus;
}

/**
 * The execution state machine shared by `usePlanTransaction`,
 * `usePlanTransactions`, `useSendTransaction` and `useSendTransactions`.
 *
 * They are the same hook with a different client method and status vocabulary:
 * `capability` is both the client method name and the capability asserted at
 * setup, so the whole hook collapses to a config object. This is
 * {@link useExecution} plus the client-specific parts — the capability
 * assertion, a `data` ref, and an `AbortController` per execution wired into
 * the RPC call.
 */
export function useClientAction<TInput, TResult, TStatus extends string>(config: {
  capability: string;
  hookName: string;
  providerHint: string;
  statuses: ClientActionStatuses<TStatus>;
}): {
  data: ShallowRef<TResult | null>;
  error: Ref<SolanaError | null>;
  execute: (input: TInput, config?: ClientActionConfig) => Promise<TResult>;
  loading: ComputedRef<boolean>;
  status: Ref<TStatus>;
} {
  const { capability, hookName, providerHint, statuses } = config;

  useClientCapability([capability, "payer"], { hookName, providerHint });

  const { client } = useSolanaClient();
  const data = shallowRef<TResult | null>(null);
  let abortController: AbortController | undefined;

  onScopeDispose(() => abortController?.abort());

  const execution = useExecution<TStatus>(statuses.working, {
    error: statuses.error,
    idle: statuses.idle,
  });

  async function execute(input: TInput, options: ClientActionConfig = {}): Promise<TResult> {
    const method = (
      client as unknown as
        | Record<string, ClientActionInvoker<TInput, TResult> | undefined>
        | undefined
    )?.[capability];

    // The setup-time assertion cannot see a client swapped in afterwards, so
    // re-check here. Thrown outside the execution so it surfaces unchanged:
    // `execute` normalizes every failure to `RPC_FAILURE`, which would bury
    // the real cause behind a `method is not a function` TypeError.
    if (typeof method !== "function") {
      throw new MissingClientCapabilityError(hookName, [capability], providerHint);
    }

    abortController?.abort();
    const controller = new AbortController();
    abortController = controller;
    data.value = null;

    const abortSignal = options.abortSignal
      ? AbortSignal.any([controller.signal, options.abortSignal])
      : controller.signal;

    return execution.execute(
      () => method(input, { abortSignal }),
      (result) => {
        data.value = result;

        return statuses.success;
      },
    );
  }

  return {
    data,
    status: execution.status,
    loading: execution.loading,
    error: execution.error,
    execute,
  };
}

type ClientActionInvoker<TInput, TResult> = (
  input: TInput,
  config: ClientActionConfig,
) => Promise<TResult>;
