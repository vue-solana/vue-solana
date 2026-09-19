import type {
  ReactiveActionSource,
  ReactiveActionState,
  ReactiveStreamSource,
  ReactiveState,
  ReactiveStreamStore,
  SolanaRpcResponse,
} from "@vue-solana/core/kit";
import {
  createReactiveStoreWithInitialValueAndSlotTracking,
  getAbortablePromise,
} from "@vue-solana/core/kit";
import { normalizeSolanaError, type SolanaError } from "@vue-solana/core/errors";
import {
  computed,
  getCurrentInstance,
  onMounted,
  onScopeDispose,
  shallowRef,
  unref,
  watch,
  type ComputedRef,
  type Ref,
} from "vue";

export type UseTrackedDataStatus = "loading" | "loaded" | "error" | "disabled";

type SendFn<TValue> = (options?: { abortSignal?: AbortSignal }) => Promise<TValue>;

/**
 * One-shot initial-value source (satisfied by `PendingRpcRequest`).
 */
export type UseTrackedDataInitialSource<TInitialValue> =
  | ReactiveActionSource<SolanaRpcResponse<TInitialValue>>
  | { send: SendFn<SolanaRpcResponse<TInitialValue>> };

/**
 * Ongoing stream source (satisfied by `PendingRpcSubscriptionsRequest`).
 */
export type UseTrackedDataStreamSource<TStreamValue> =
  | ReactiveStreamSource<SolanaRpcResponse<TStreamValue>>
  | { reactiveStore: () => ReactiveStreamStore<SolanaRpcResponse<TStreamValue>> };

/**
 * A `useTrackedData` source bundle. Every field accepts a plain source or a
 * `ref`/`computed` of it; a `null`/`undefined` `rpcRequest` or
 * `rpcSubscriptionRequest` disables the composable.
 */
export interface UseTrackedDataSource<TInitialValue, TStreamValue, TItem> {
  /**
   * One-shot RPC request for the initial value, for example
   * `rpc.getBalance(address)`.
   */
  rpcRequest:
    | UseTrackedDataInitialSource<TInitialValue>
    | Ref<UseTrackedDataInitialSource<TInitialValue> | null | undefined>;
  /**
   * RPC subscription request for live updates, for example
   * `rpcSubscriptions.accountNotifications(address)`.
   */
  rpcSubscriptionRequest:
    | UseTrackedDataStreamSource<TStreamValue>
    | Ref<UseTrackedDataStreamSource<TStreamValue> | null | undefined>;
  /**
   * Maps the initial fetch's response value to the stored item type.
   */
  rpcValueMapper: (value: TInitialValue) => TItem;
  /**
   * Maps a stream notification's value to the stored item type.
   */
  rpcSubscriptionValueMapper: (value: TStreamValue) => TItem;
}

export interface UseTrackedDataOptions {
  /**
   * Returns a caller-provided `AbortSignal` per connection (for example
   * `AbortSignal.timeout(60_000)`), composed with the per-connection signal
   * by the underlying store. Aborting it fails the connection with the abort
   * reason without touching other state.
   */
  getAbortSignal?: (connection: number) => AbortSignal | null | undefined;
  /**
   * Called when the tracked data transitions into `error`.
   */
  onError?: (error: unknown) => void;
}

export interface UseTrackedDataReturn<TItem> {
  /**
   * The latest item, surface-mapped by `rpcValueMapper` /
   * `rpcSubscriptionValueMapper`. The {@link SolanaRpcResponse} envelope is
   * preserved so callers can read `data.value?.context.slot`.
   */
  data: ComputedRef<SolanaRpcResponse<TItem> | undefined>;
  error: ComputedRef<SolanaError | null>;
  refresh: () => void;
  status: ComputedRef<UseTrackedDataStatus>;
}

function isActionSource<TResult>(value: unknown): value is ReactiveActionSource<TResult> {
  return (
    typeof value === "object" &&
    value !== null &&
    "reactiveStore" in value &&
    typeof (value as { reactiveStore?: unknown }).reactiveStore === "function"
  );
}

/**
 * Live RPC data seeded by a one-shot fetch, slot-deduplicated between the two
 * sources so notifications and the initial response can arrive in any order
 * without out-of-order regressions.
 *
 * - `refresh()` aborts the current connection and re-runs both the fetch and
 *   the subscription with stale-while-revalidate (last known `data` stays
 *   visible while loading).
 * - A `null`/`undefined` source (or `ref` of one) disables the composable and
 *   clears state.
 * - `getAbortSignal` attaches per-connection cancellation (timeouts, kill
 *   switches) on top of the internal per-connection signal.
 */
export function useTrackedData<TInitialValue, TStreamValue, TItem>(
  source: UseTrackedDataSource<TInitialValue, TStreamValue, TItem>,
  options: UseTrackedDataOptions = {},
): UseTrackedDataReturn<TItem> {
  const data = shallowRef<SolanaRpcResponse<TItem> | undefined>(undefined);
  const error = shallowRef<SolanaError | null>(null);
  const status = shallowRef<UseTrackedDataStatus>("loading");
  const disposables: (() => void)[] = [];
  let connectionCount = 0;
  let disposed = false;
  let activeStore: ReactiveStreamStore<SolanaRpcResponse<TItem>> | undefined;

  function applyState(state: ReactiveState<SolanaRpcResponse<TItem>>) {
    if (state.status === "loaded") {
      data.value = state.data;
      error.value = null;
      status.value = "loaded";
    } else if (state.status === "error") {
      error.value = normalizeSolanaError(state.error, "RPC_FAILURE");
      status.value = "error";
      options.onError?.(state.error);
    } else if (state.status === "loading") {
      // Stale-while-revalidate: keep the stale value while reconnecting.
      status.value = data.value === undefined ? "loading" : status.value;
    } else if (state.status === "idle") {
      // A fresh connection window (initial mount, refresh(), source change)
      // starts idle. Preserve the last known data and status for
      // stale-while-revalidate; only `disabled` clears them.
      error.value = null;
    }
  }

  function buildAndConnect() {
    if (disposed) {
      return;
    }

    let rpcRequest = unref(source.rpcRequest);
    const rpcSubscriptionRequest = unref(source.rpcSubscriptionRequest);

    if (!rpcRequest || !rpcSubscriptionRequest) {
      disconnect();
      data.value = undefined;
      error.value = null;
      status.value = "disabled";

      return;
    }

    if (!isActionSource(rpcRequest) && isSendSource(rpcRequest)) {
      // Wrap a bare `send()` source so the slot-tracking store can drive it
      // through the ReactiveActionSource duck-type: each dispatch sends the
      // request and publishes the response through the store's state.
      const sendSource = rpcRequest as { send: SendFn<SolanaRpcResponse<TInitialValue>> };
      const listeners = new Set<() => void>();
      let sendState: ReactiveActionState<SolanaRpcResponse<TInitialValue>> = {
        data: undefined,
        error: undefined,
        status: "idle",
      };
      // ponytail: per-connection controller so each dispatch aborts the
      // previous in-flight send, mirroring the Kit store's dispatch semantics.
      let controller: AbortController | undefined;

      const emit = () => {
        listeners.forEach((listener) => {
          listener();
        });
      };

      const settle = (next: ReactiveActionState<SolanaRpcResponse<TInitialValue>>) => {
        sendState = next;
        emit();
      };

      function runSend(abortSignal?: AbortSignal) {
        controller?.abort();
        controller = new AbortController();
        const composed = abortSignal
          ? AbortSignal.any([controller.signal, abortSignal])
          : controller.signal;

        settle({ data: undefined, error: undefined, status: "running" });

        const pending = Promise.resolve(sendSource.send({ abortSignal: composed }));

        pending
          .then((response) => {
            settle({ data: response, error: undefined, status: "success" });
          })
          .catch((cause) => {
            settle({ data: undefined, error: cause, status: "error" });
          });

        // Race the send against the composed signal so a reconnection or
        // teardown abort fails the attempt even if the source ignores it.
        return getAbortablePromise(pending, composed);
      }

      rpcRequest = {
        reactiveStore: () => ({
          dispatch() {
            void runSend().catch(() => {});
          },
          dispatchAsync: () => runSend(),
          getState: () => sendState,
          reset() {
            controller?.abort();
            settle({ data: undefined, error: undefined, status: "idle" });
          },
          subscribe(listener) {
            listeners.add(listener);

            return () => {
              listeners.delete(listener);
            };
          },
          withSignal(signal: AbortSignal) {
            return {
              dispatch: () => {
                void runSend(signal).catch(() => {});
              },
              dispatchAsync: () => runSend(signal),
            };
          },
        }),
      };
    }

    connectionCount += 1;
    const connection = connectionCount;
    const callerSignal = options.getAbortSignal?.(connection);

    const store = createReactiveStoreWithInitialValueAndSlotTracking({
      initialValueMapper: source.rpcValueMapper,
      initialValueSource: rpcRequest as ReactiveActionSource<SolanaRpcResponse<TInitialValue>>,
      streamSource: rpcSubscriptionRequest as ReactiveStreamSource<SolanaRpcResponse<TStreamValue>>,
      streamValueMapper: source.rpcSubscriptionValueMapper,
    });

    activeStore = store;
    applyState(store.getState());

    disposables.push(
      store.subscribe(() => {
        applyState(store.getState());
      }),
    );

    if (callerSignal?.aborted) {
      applyState({ data: store.getState().data, error: callerSignal.reason, status: "error" });

      return;
    }

    if (callerSignal) {
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
  }

  // Rebuild both connections whenever a ref/computed source changes. `unref`
  // reads the ref's value (tracking it) without invoking function sources.
  watch(
    () => [unref(source.rpcRequest), unref(source.rpcSubscriptionRequest)] as const,
    () => {
      buildAndConnect();
    },
    { flush: "post" },
  );
  onMounted(() => {
    buildAndConnect();
  });

  if (!getCurrentInstance()) {
    buildAndConnect();
  }

  onScopeDispose(() => {
    disposed = true;
    disconnect();
  });

  return {
    data: computed(() => data.value),
    error: computed(() => error.value),
    refresh: () => {
      buildAndConnect();
    },
    status: computed(() => status.value),
  };
}

function isSendSource(value: unknown): value is { send: SendFn<unknown> } {
  return (
    typeof value === "object" &&
    value !== null &&
    "send" in value &&
    typeof (value as { send?: unknown }).send === "function"
  );
}
