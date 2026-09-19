import { createSolanaActionStore, type SolanaActionState } from "@vue-solana/core/action";
import { computed, onScopeDispose, shallowRef, unref, type ComputedRef, type Ref } from "vue";

export type UseActionStatus = "idle" | "running" | "success" | "error";

export interface UseActionOptions {
  /**
   * Called after a dispatch settles successfully.
   */
  onSuccess?: (data: unknown) => void;
  /**
   * Called after a dispatch fails for a reason other than supersession.
   */
  onError?: (error: unknown) => void;
}

export interface UseActionReturn<TArgs extends readonly unknown[], TResult> {
  data: ComputedRef<TResult | undefined>;
  dispatch: (...args: TArgs) => Promise<TResult>;
  error: ComputedRef<unknown>;
  isRunning: ComputedRef<boolean>;
  reset: () => void;
  status: ComputedRef<UseActionStatus>;
}

/**
 * Generic async action state machine.
 *
 * Accepts any async function that receives a fresh `AbortSignal` per call and
 * tracks `{ data, dispatch, error, isRunning, reset, status }` through Vue
 * reactive state.
 *
 * - There is no dependencies array: pass the handler directly or as a ref;
 *   `dispatch` always invokes the latest closure, so handlers reading
 *   reactive state never see stale values. `dispatch` keeps a stable identity
 *   across the component lifetime.
 * - Calling `dispatch` again while a call is in flight aborts the previous
 *   call. Superseded calls reject with an abort reason so callers can detect
 *   them; they never corrupt state.
 * - Failures surface on `error` while the previous `data` is preserved for
 *   stale-while-revalidate rendering.
 *
 * The underlying state machine is `createSolanaActionStore` from
 * `@vue-solana/core/action`, shared with non-Vue consumers.
 */
export function useAction<TArgs extends readonly unknown[], TResult>(
  action:
    | ((signal: AbortSignal, ...args: TArgs) => Promise<TResult>)
    | Ref<(signal: AbortSignal, ...args: TArgs) => Promise<TResult>>,
  options: UseActionOptions = {},
): UseActionReturn<TArgs, TResult> {
  const store = createSolanaActionStore<TArgs, TResult>((signal, ...args) =>
    unref(action)(signal, ...args),
  );
  const state = shallowRef<SolanaActionState<TResult>>(store.getState());

  const unsubscribe = store.subscribe(() => {
    const next = store.getState();
    const previous = state.value;

    if (next.status === "success" && previous.status !== "success") {
      options.onSuccess?.(next.data);
    }

    if (next.status === "error" && previous.status !== "error") {
      options.onError?.(next.error);
    }

    state.value = next;
  });

  onScopeDispose(() => {
    unsubscribe();
    // Abort any in-flight dispatch so it cannot resolve into orphaned state.
    store.reset();
  });

  return {
    data: computed(() => state.value.data as TResult | undefined),
    dispatch: (...args: TArgs) => store.dispatchAsync(...args),
    error: computed(() => state.value.error),
    isRunning: computed(() => state.value.status === "running"),
    reset: () => {
      store.reset();
    },
    status: computed(() => state.value.status as UseActionStatus),
  };
}
