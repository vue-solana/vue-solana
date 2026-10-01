import type { Address } from "@vue-solana/core/kit";
import { parseAddress } from "@vue-solana/core/address";
import { normalizeSolanaError, type SolanaError } from "@vue-solana/core/errors";
import {
  onMounted,
  onScopeDispose,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type ShallowRef,
} from "vue";

export interface UseAddressReadReturn<TData> {
  data: ShallowRef<TData>;
  error: ShallowRef<SolanaError | null>;
  loading: ShallowRef<boolean>;
  refresh: () => Promise<TData | null>;
}

/**
 * The supersede-and-report state machine shared by every address-keyed RPC read
 * composable in this package (`useBalance`, `useAccountInfo`, `useProgramAccounts`,
 * `useTokenAccounts`, `useTokenBalance`).
 *
 * - Empty input clears state and reads nothing; invalid input reports
 *   `INVALID_ADDRESS` without touching the RPC.
 * - A newer `refresh()` wins: older attempts resolve but never write state.
 * - `data` drops back to `empty` when a read errors, because a stale value next
 *   to a fresh error reads as current data when it is not.
 * - `refresh()` rethrows the failure, already normalized to a `SolanaError`.
 *
 * This is deliberately not built on `useRequest`: that bridges Kit's
 * `createReactiveActionStore`, which cannot dispatch where `AbortSignal` is not
 * a Node `EventTarget` (every browser-shaped test environment), and its
 * `refresh()` resolves rather than rethrows.
 */
export function useAddressRead<TResult, TData>(
  addresses: readonly MaybeRefOrGetter<string | null | undefined>[],
  read: (...parsed: Address[]) => Promise<TResult>,
  select: (result: TResult) => TData,
  empty: TData,
): UseAddressReadReturn<TData> {
  const data = shallowRef<TData>(empty);
  const loading = shallowRef(false);
  const error = shallowRef<SolanaError | null>(null);
  let refreshId = 0;

  async function refresh(): Promise<TData | null> {
    const requestId = ++refreshId;
    const values = addresses.map((address) => toValue(address));

    if (values.some((value) => !value)) {
      data.value = empty;
      loading.value = false;
      error.value = null;
      return null;
    }

    loading.value = true;
    error.value = null;

    try {
      const next = select(await read(...(values as string[]).map((value) => parseAddress(value)!)));

      if (requestId === refreshId) {
        data.value = next;
      }

      return next;
    } catch (cause) {
      const normalizedError = normalizeSolanaError(cause, "RPC_FAILURE");

      if (requestId === refreshId) {
        data.value = empty;
        error.value = normalizedError;
      }

      throw normalizedError;
    } finally {
      if (requestId === refreshId) {
        loading.value = false;
      }
    }
  }

  onMounted(() => {
    void refresh().catch(() => undefined);
  });

  onScopeDispose(() => {
    refreshId += 1;
  });

  watch(
    () => addresses.map((address) => toValue(address)),
    () => {
      void refresh().catch(() => undefined);
    },
  );

  return { data, loading, error, refresh };
}
