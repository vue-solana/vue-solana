import { normalizeSolanaError, type SolanaError } from "@vue-solana/core/errors";
import {
  computed,
  onScopeDispose,
  ref,
  shallowRef,
  type ComputedRef,
  type Ref,
  type ShallowRef,
} from "vue";
import { useClientCapability } from "./useClientCapability";
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
 * setup, so the whole hook collapses to a config object. Starting an execution
 * aborts the previous one, `loading` is derived from `status`, and failures
 * are normalized to `SolanaError` with `RPC_FAILURE`.
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
  const status: ShallowRef<TStatus> = shallowRef(statuses.idle);
  const loading = computed(() => status.value === statuses.working);
  const error = ref<SolanaError | null>(null);
  let executionId = 0;
  let abortController: AbortController | undefined;

  onScopeDispose(() => {
    abortController?.abort();
    executionId++;
  });

  async function execute(input: TInput, options: ClientActionConfig = {}): Promise<TResult> {
    abortController?.abort();
    const controller = new AbortController();
    abortController = controller;
    const currentExecutionId = ++executionId;

    status.value = statuses.working;
    error.value = null;
    data.value = null;

    try {
      const abortSignal = options.abortSignal
        ? AbortSignal.any([controller.signal, options.abortSignal])
        : controller.signal;
      const method = (client as unknown as Record<string, ClientActionInvoker<TInput, TResult>>)[
        capability
      ];
      const result = await method!(input, { abortSignal });

      if (currentExecutionId === executionId) {
        data.value = result;
        status.value = statuses.success;
      }

      return result;
    } catch (cause) {
      const normalizedError = normalizeSolanaError(cause, "RPC_FAILURE");

      if (currentExecutionId === executionId) {
        error.value = normalizedError;
        status.value = statuses.error;
      }

      throw normalizedError;
    }
  }

  return { data, status, loading, error, execute };
}

type ClientActionInvoker<TInput, TResult> = (
  input: TInput,
  config: ClientActionConfig,
) => Promise<TResult>;
