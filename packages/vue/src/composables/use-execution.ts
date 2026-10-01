import { normalizeSolanaError, type SolanaError } from "@vue-solana/core/errors";
import { computed, shallowRef, type ComputedRef, type Ref, type ShallowRef } from "vue";

/**
 * The supersede-and-report state machine shared by the wallet composables in this
 * package: one in-flight execution at a time, `loading` derived from the busy
 * status, and a superseded execution that resolves but never writes state.
 *
 * `useAction` cannot back this: it bridges Kit's `createReactiveActionStore`,
 * whose `AbortSignal` handling throws wherever `AbortSignal` is not a Node
 * `EventTarget` (every browser-shaped test environment), and whose status
 * vocabulary (`idle | running | success | error`) is not these composables'
 * documented public statuses.
 */
export interface UseExecution<TStatus extends string> {
  error: Ref<SolanaError | null>;
  execute: <TResult>(
    run: () => Promise<TResult>,
    settled: (result: TResult) => TStatus,
  ) => Promise<TResult>;
  loading: ComputedRef<boolean>;
  reset: () => void;
  status: ShallowRef<TStatus>;
}

export function useExecution<TStatus extends string>(busy: TStatus): UseExecution<TStatus> {
  const status: ShallowRef<TStatus> = shallowRef("idle" as TStatus);
  const error = shallowRef<SolanaError | null>(null);
  let id = 0;

  async function execute<TResult>(
    run: () => Promise<TResult>,
    settled: (result: TResult) => TStatus,
  ): Promise<TResult> {
    const currentId = ++id;

    status.value = busy;
    error.value = null;

    try {
      const result = await run();

      if (currentId === id) {
        status.value = settled(result);
      }

      return result;
    } catch (cause) {
      const normalizedError = normalizeSolanaError(cause, "RPC_FAILURE");

      if (currentId === id) {
        error.value = normalizedError;
        status.value = "error" as TStatus;
      }

      throw normalizedError;
    }
  }

  function reset() {
    id += 1;
    status.value = "idle" as TStatus;
    error.value = null;
  }

  return { status, error, loading: computed(() => status.value === busy), execute, reset };
}
