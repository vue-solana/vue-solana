import { createSolanaActionStore } from "@vue-solana/core/action";
import { getAbortablePromise } from "@vue-solana/core/kit";
import { normalizeSolanaError, type SolanaError } from "@vue-solana/core/errors";
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

export type UseRequestStatus = "fetching" | "success" | "error" | "disabled";

type SendFn<TResult> = (options?: { abortSignal?: AbortSignal }) => Promise<TResult>;

type ResolvedSource<TResult> =
  | ((signal: AbortSignal) => Promise<TResult> | { send: SendFn<TResult> })
  | { send: SendFn<TResult> }
  | null
  | undefined;

/**
 * A request source accepted by `useRequest`:
 *
 * - a request function `(signal) => Promise<T>`, called with a fresh composed
 *   `AbortSignal` per attempt (it may return a Kit request object, which is
 *   sent with the signal automatically),
 * - a Kit reactive store source such as `PendingRpcRequest` (for example
 *   `rpc.getBalance(address)`),
 * - a `ref`/`computed` of any of the above, or of `null` to disable, or
 * - `null` to disable outright.
 */
export type UseRequestSource<TResult> = ResolvedSource<TResult> | Ref<ResolvedSource<TResult>>;

export interface UseRequestOptions {
  /**
   * Returns a caller-provided `AbortSignal` per attempt (for example
   * `AbortSignal.timeout(5_000)`), composed with the internal per-attempt
   * signal. Aborting it fails the attempt without touching other state. Read
   * fresh from the latest render, so inline closures need no `useCallback`.
   */
  getAbortSignal?: (attempt: number) => AbortSignal | null | undefined;
}

/** Per-call abort overrides for `refresh()`. */
export type UseRequestRefresherOptions = {
  /**
   * Applies only this signal to the attempt, bypassing `getAbortSignal`.
   * Passing `undefined` (or an empty options object) applies no caller signal
   * for that attempt; call `refresh()` with no argument to keep the
   * `getAbortSignal` factory behavior.
   */
  abortSignal?: AbortSignal;
};

export interface UseRequestReturn<TResult> {
  data: ComputedRef<TResult | undefined>;
  error: ComputedRef<SolanaError | null>;
  /** Re-fires manually. `refresh({ abortSignal })` overrides `getAbortSignal` for that attempt. */
  refresh: (options?: UseRequestRefresherOptions) => Promise<TResult | undefined>;
  status: ComputedRef<UseRequestStatus>;
}

/**
 * One-shot async request that re-fires when its source changes identity, with
 * stale-while-revalidate: while a new attempt runs, the previous `data` and
 * `error` stay populated so the UI keeps rendering.
 *
 * Status set: `fetching` | `success` | `error` | `disabled`.
 *
 * - The first attempt fires on mount inside a component (or immediately when
 *   called outside one).
 * - Passing a ref/computed source re-fires whenever the source identity
 *   changes; a `null` source clears state and reports `disabled`.
 * - `refresh()` re-fires manually and resolves with the attempt result;
 *   `refresh({ abortSignal })` overrides the caller signal for that attempt.
 * - `getAbortSignal` (read fresh per render, so inline closures are fine)
 *   attaches per-attempt cancellation on top of the internal per-attempt
 *   signal.
 * - Passing `null` as the source, or unmounting, cancels in-flight work and
 *   reports `disabled`.
 */
export function useRequest<TResult>(
  source: UseRequestSource<TResult>,
  options: UseRequestOptions = {},
): UseRequestReturn<TResult> {
  const data = shallowRef<TResult | undefined>(undefined);
  const error = shallowRef<SolanaError | null>(null);
  const status = shallowRef<UseRequestStatus>("fetching");
  let disposed = false;
  let attempt = 0;

  const store = createSolanaActionStore<
    [ResolvedSource<TResult>, UseRequestRefresherOptions | undefined],
    TResult
  >(async (signal, resolved, override) => {
    attempt += 1;

    // A per-call override on refresh() replaces the factory for that
    // attempt; `refresh({ abortSignal: undefined })` means "no caller
    // signal" and `refresh()` keeps the `getAbortSignal` behavior.
    const callerSignal = override ? override.abortSignal : options.getAbortSignal?.(attempt);
    const composedSignal = callerSignal ? AbortSignal.any([signal, callerSignal]) : signal;

    let pending: Promise<TResult>;

    if (isSendSource<TResult>(resolved)) {
      pending = Promise.resolve(resolved.send({ abortSignal: composedSignal }));
    } else if (typeof resolved === "function") {
      pending = Promise.resolve(resolved(composedSignal)).then((result) =>
        isSendSource<TResult>(result) ? result.send({ abortSignal: composedSignal }) : result,
      );
    } else {
      throw new Error("useRequest source did not resolve to a request function");
    }

    // Race the attempt against the composed signal so a caller-provided
    // abort (timeout, kill switch) fails the attempt even when the source
    // ignores its signal.
    return getAbortablePromise(pending, composedSignal);
  });

  const unsubscribe = store.subscribe(() => {
    const next = store.getState();

    if (next.status === "success") {
      data.value = next.data;
      error.value = null;
      status.value = "success";
    } else if (next.status === "error") {
      error.value = normalizeSolanaError(next.error, "RPC_FAILURE");
      status.value = "error";
    } else if (next.status === "running") {
      status.value = "fetching";
    }
  });

  onScopeDispose(() => {
    disposed = true;
    unsubscribe();
    store.reset();
  });

  /**
   * Resolves the current source. Refs and computeds unwrap to the latest
   * source identity; bare functions are the request function itself.
   */
  function unwrapSource(): ResolvedSource<TResult> {
    if (isRef(source)) {
      return source.value;
    }

    return source;
  }

  async function run(override?: UseRequestRefresherOptions): Promise<TResult | undefined> {
    if (disposed) {
      return undefined;
    }

    // Snapshot the source once, here, and hand it to the store as an argument
    // so a ref that flips to `null` mid-flight cannot fail the new attempt:
    // the running attempt always operates on the source it was started with.
    const resolved = unwrapSource();

    if (isDisabled(resolved)) {
      data.value = undefined;
      error.value = null;
      status.value = "disabled";
      // Abort whatever is in flight so a stale resolution cannot repopulate
      // state after the source just disabled.
      store.reset();

      return undefined;
    }

    status.value = "fetching";

    try {
      return await store.dispatchAsync(resolved, override);
    } catch (cause) {
      // Superseded or aborted attempts leave the newest attempt in charge of
      // state, so only surface failures that actually landed on state.
      if (store.getState().status !== "error") {
        return undefined;
      }

      throw normalizeSolanaError(cause, "RPC_FAILURE");
    }
  }

  const refresh = (options?: UseRequestRefresherOptions): Promise<TResult | undefined> =>
    run(options);

  watch(
    () => (isRef(source) ? source.value : source),
    () => {
      void refresh().catch(() => undefined);
    },
  );

  // Fire the first attempt on mount inside a component. Outside a component
  // instance (tests, embedded scripts) fetch immediately instead.
  onMounted(() => {
    void refresh().catch(() => undefined);
  });

  if (!getCurrentInstance()) {
    void refresh().catch(() => undefined);
  }

  return {
    data: computed(() => data.value),
    error: computed(() => error.value),
    refresh,
    status: computed(() => status.value),
  };
}

function isDisabled(resolved: unknown): boolean {
  return resolved === null || resolved === undefined;
}

function isSendSource<TResult>(resolved: unknown): resolved is { send: SendFn<TResult> } {
  return (
    typeof resolved === "object" &&
    resolved !== null &&
    "send" in resolved &&
    typeof (resolved as { send?: unknown }).send === "function"
  );
}
