import { normalizeSolanaError, type SolanaError } from "@vue-solana/core/errors";
import type { ReactiveState, ReactiveStreamStore } from "@vue-solana/core/kit";
import {
  computed,
  getCurrentInstance,
  isRef,
  onMounted,
  onScopeDispose,
  shallowRef,
  watch,
  type ComputedRef,
  type Ref,
} from "vue";

export type UseSubscriptionStatus = "loading" | "loaded" | "error" | "disabled";

/**
 * A subscription source accepted by `useSubscription`:
 *
 * - a Kit reactive stream source such as `PendingRpcSubscriptionsRequest`
 *   (for example `rpcSubscriptions.accountNotifications(address)`),
 * - a `ref`/`computed` of a source or `null` to disable, or
 * - `null` to disable outright.
 */
export type UseSubscriptionSource<TResult> =
  | { reactiveStore: () => ReactiveStreamStore<TResult> }
  | Ref<{ reactiveStore: () => ReactiveStreamStore<TResult> } | null | undefined>
  | null
  | undefined;

export interface UseSubscriptionOptions {
  /**
   * Returns a caller-provided `AbortSignal` per connection (for example
   * `AbortSignal.timeout(30_000)`), composed with the per-connection signal by
   * the underlying store. Aborting it fails the connection with the abort
   * reason without touching other state.
   */
  getAbortSignal?: (connection: number) => AbortSignal | null | undefined;
  /**
   * Called when the subscription transitions into `error`.
   */
  onError?: (error: unknown) => void;
}

export interface UseSubscriptionReturn<TResult> {
  data: ComputedRef<TResult | undefined>;
  error: ComputedRef<SolanaError | null>;
  reconnect: () => void;
  status: ComputedRef<UseSubscriptionStatus>;
}

/**
 * Live data from RPC subscriptions and other reactive stream sources.
 *
 * Accepts a Kit reactive stream source (duck-typed on `reactiveStore()`),
 * bridges its `{ subscribe, getState }` contract into Vue reactive state, and
 * tears the connection down when the component unmounts.
 *
 * Status set: `loading` | `loaded` | `error` | `disabled`.
 *
 * - A `null` source disables the subscription and clears state.
 * - `reconnect()` re-opens the connection with stale-while-revalidate: the
 *   last known `data` stays visible until fresh data arrives.
 * - Errors preserve the last known `data`; only the first error per connection
 *   window is captured (matching the underlying store's contract).
 * - Changing a ref/computed source tears down the previous subscription and
 *   connects to the new one.
 */
export function useSubscription<TResult>(
  source: UseSubscriptionSource<TResult>,
  options: UseSubscriptionOptions = {},
): UseSubscriptionReturn<TResult> {
  const data = shallowRef<TResult | undefined>(undefined);
  const error = shallowRef<SolanaError | null>(null);
  const status = shallowRef<UseSubscriptionStatus>("loading");
  const disposables: (() => void)[] = [];
  let connectionCount = 0;
  let disposed = false;
  let activeSource: { reactiveStore: () => ReactiveStreamStore<TResult> } | undefined;
  let activeStore: ReactiveStreamStore<TResult> | undefined;

  function applyState(state: ReactiveState<TResult>) {
    if (state.status === "loaded") {
      data.value = state.data;
      error.value = null;
      status.value = "loaded";
    } else if (state.status === "error") {
      error.value = normalizeSolanaError(state.error, "RPC_FAILURE");
      status.value = "error";
      options.onError?.(state.error);
    } else if (state.status === "loading") {
      // Keep showing the stale value while reconnecting.
      status.value = data.value === undefined ? "loading" : status.value;
    } else if (state.status === "idle") {
      data.value = undefined;
      error.value = null;
      status.value = "loading";
    }
  }

  function openConnection(store: ReactiveStreamStore<TResult>) {
    activeStore = store;
    connectionCount += 1;
    const connection = connectionCount;
    const callerSignal = options.getAbortSignal?.(connection);

    applyState(store.getState());

    disposables.push(
      store.subscribe(() => {
        applyState(store.getState());
      }),
    );

    if (callerSignal?.aborted) {
      // A pre-aborted caller signal fails the connection immediately.
      applyState({ data: store.getState().data, error: callerSignal.reason, status: "error" });

      return;
    }

    if (callerSignal) {
      // Connect with the caller's signal composed by the store itself.
      store.withSignal(callerSignal).connect();
    } else {
      store.connect();
    }
  }

  function disconnect() {
    disposables.forEach((dispose) => {
      dispose();
    });
    disposables.length = 0;

    if (activeStore) {
      activeStore.reset();
      activeStore = undefined;
    }

    activeSource = undefined;
  }

  function connectCurrent() {
    if (disposed) {
      return;
    }

    const resolved = isRef(source) ? source.value : source;

    if (resolved === null || resolved === undefined) {
      disconnect();
      data.value = undefined;
      error.value = null;
      status.value = "disabled";

      return;
    }

    if (activeSource === resolved && activeStore) {
      // Same source: re-open the existing connection (stale-while-revalidate).
      openConnection(activeStore);

      return;
    }

    disconnect();
    activeSource = resolved;
    openConnection(resolved.reactiveStore());
  }

  watch(
    () => (isRef(source) ? source.value : (source as typeof source & object)),
    () => {
      connectCurrent();
    },
    { flush: "sync" },
  );

  onMounted(() => {
    connectCurrent();
  });

  if (!getCurrentInstance()) {
    connectCurrent();
  }

  onScopeDispose(() => {
    disposed = true;
    disconnect();
  });

  return {
    data: computed(() => data.value),
    error: computed(() => error.value),
    reconnect: () => {
      connectCurrent();
    },
    status: computed(() => status.value),
  };
}
