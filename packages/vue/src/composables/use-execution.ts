import {
  normalizeSolanaError,
  type SolanaError,
  type SolanaErrorCode,
} from "@vue-solana/core/errors";
import {
  computed,
  onScopeDispose,
  shallowRef,
  type ComputedRef,
  type Ref,
  type ShallowRef,
} from "vue";

/**
 * The supersede-and-report state machine behind every action composable in this
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

/**
 * `idle` and `error` are the only statuses every caller shares, so they default
 * here and only a hook with a different vocabulary passes them (`useClientAction`).
 *
 * `failureCode` is the code for a failure that is not already a `SolanaError`.
 * It defaults to `RPC_FAILURE` because most callers do network work; composables
 * whose only failure mode is wallet work (`useSignMessage`, `useSignIn`,
 * `useSignTransactions`) pass `WALLET_FAILURE` so an app does not render a
 * network error for a wallet that never reached the network. Composables that
 * mix both (the sign-and-send pair) keep the RPC default and rely on the
 * specific codes thrown before the RPC call.
 */
export function useExecution<TStatus extends string>(
  busy: TStatus,
  statuses: { error?: TStatus; idle?: TStatus; failureCode?: SolanaErrorCode } = {},
): UseExecution<TStatus> {
  const errorStatus = statuses.error ?? ("error" as TStatus);
  const idleStatus = statuses.idle ?? ("idle" as TStatus);
  const failureCode = statuses.failureCode ?? "RPC_FAILURE";
  const status: ShallowRef<TStatus> = shallowRef(idleStatus);
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
      const normalizedError = normalizeSolanaError(cause, failureCode);

      if (currentId === id) {
        error.value = normalizedError;
        status.value = errorStatus;
      }

      throw normalizedError;
    }
  }

  function reset() {
    id += 1;
    status.value = idleStatus;
    error.value = null;
  }

  // A wallet prompt outlives the component often enough to matter: without this
  // the execution is still current on unmount and writes `status`/`error` into
  // refs nothing reads any more.
  onScopeDispose(() => {
    id += 1;
  });

  return { status, error, loading: computed(() => status.value === busy), execute, reset };
}
