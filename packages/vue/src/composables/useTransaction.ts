import { createSolanaActionStore, isSolanaActionAborted } from "@vue-solana/core/action";
import { normalizeSolanaError, type SolanaError } from "@vue-solana/core/errors";
import { withSolanaTimeout } from "@vue-solana/core/timeout";
import { getCurrentScope, onScopeDispose, ref, shallowRef } from "vue";

export interface UseTransactionOptions {
  timeoutMs?: number;
  timeoutMessage?: string;
}

const DEFAULT_TIMEOUT_MESSAGE = "Transaction did not return a result before timing out.";

/**
 * Execute a transaction-building workflow and track `{ signature, loading,
 * error }` through Vue state.
 *
 * Built on the same action state machine as `useAction`
 * (`createSolanaActionStore` from `@vue-solana/core/action`): starting a new
 * execution while one is in flight supersedes it — the older call's outcome
 * is dropped and its promise rejects without touching state, so newer
 * executions always own `signature`/`loading`/`error`. Each execution is
 * raced against `timeoutMs` (`TRANSACTION_TIMEOUT` when exceeded).
 */
export function useTransaction<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<string>,
  options: UseTransactionOptions = {},
) {
  const signature = shallowRef<string | null>(null);
  const loading = ref(false);
  const error = ref<SolanaError | null>(null);

  const store = createSolanaActionStore<TArgs, string>(async (_signal, ...args) => {
    const attempt = withSolanaTimeout(
      handler(...args),
      options.timeoutMs,
      options.timeoutMessage ?? DEFAULT_TIMEOUT_MESSAGE,
    );

    // A superseded attempt's eventual timeout rejection must not surface as
    // an unhandled rejection; the newest execution owns state.
    attempt.catch(() => undefined);

    return attempt;
  });

  const unsubscribe = store.subscribe(() => {
    const state = store.getState();

    if (state.status === "running") {
      loading.value = true;
    } else if (state.status === "success") {
      signature.value = state.data;
      loading.value = false;
      error.value = null;
    } else if (state.status === "error") {
      error.value = normalizeSolanaError(state.error, "RPC_FAILURE");
      loading.value = false;
    }
  });

  if (getCurrentScope()) {
    onScopeDispose(() => {
      unsubscribe();
      store.reset();
    });
  }

  async function execute(...args: TArgs): Promise<string> {
    loading.value = true;
    error.value = null;

    try {
      return await store.dispatchAsync(...args);
    } catch (cause) {
      // Superseded executions are silent on state; only surface real
      // failures (already normalized on state by the subscriber for those).
      if (isSolanaActionAborted(cause)) {
        throw cause;
      }

      throw normalizeSolanaError(cause, "RPC_FAILURE");
    }
  }

  return {
    signature,
    loading,
    error,
    execute,
  };
}
