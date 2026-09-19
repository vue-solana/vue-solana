import type { SolanaError } from "@vue-solana/core/errors";
import type { SolanaRpcResponse } from "@vue-solana/core/kit";
import { computed, watch } from "vue";
import type { UseRequestOptions, UseRequestReturn } from "./composables/useRequest";
import { useRequest } from "./composables/useRequest";
import type {
  UseSubscriptionOptions,
  UseSubscriptionReturn,
  UseSubscriptionSource,
} from "./composables/useSubscription";
import { useSubscription } from "./composables/useSubscription";
import type {
  UseTrackedDataOptions,
  UseTrackedDataReturn,
  UseTrackedDataSource,
} from "./composables/useTrackedData";
import { useTrackedData } from "./composables/useTrackedData";

/**
 * SWR-for-Vue adapters over the core data composables — the Vue counterpart
 * of `@solana/react/swr`.
 *
 * Components mounted with the same cache key share the last-known result:
 * a freshly mounted component seeds its `data` from the cache immediately
 * (stale-while-revalidate) while its own request/subscription runs, and
 * every state change is written back to the cache for the next mount.
 *
 * There is deliberately **no `useAction` adapter**: actions are imperative
 * mutations, not cacheable reads — a mutation API on your data layer (or
 * `useAction` itself) is the equivalent.
 *
 * This module is dependency-free (no external cache library, no optional
 * peer dependency). The cache is a module-level `Map`, so on the server
 * namespace keys per request (or clear the cache) to avoid cross-request
 * leakage.
 *
 * Keys are namespaced per adapter (`request:`, `subscription:`, `tracked:`),
 * so the same key can be used across adapters without collisions.
 */

interface SwrCacheEntry {
  data?: unknown;
  error?: SolanaError | null;
  status?: string;
}

const PREFIX_REQUEST = "request:";
const PREFIX_SUBSCRIPTION = "subscription:";
const PREFIX_TRACKED = "tracked:";

const swrCache = new Map<string, SwrCacheEntry>();

/**
 * Remove every cached SWR entry (all adapters). Useful between test cases
 * and to reset server-side caches per request.
 */
export function clearSwrCache(): void {
  swrCache.clear();
}

function readSwrCache(key: string): SwrCacheEntry | undefined {
  return swrCache.get(key);
}

function writeSwrCache(key: string, entry: SwrCacheEntry): void {
  swrCache.set(key, entry);
}

function deleteSwrCache(key: string): void {
  swrCache.delete(key);
}

function isPendingStatus(status: string): boolean {
  return status === "fetching" || status === "loading";
}

/**
 * Persists the current result, preserving the last-known-good cached data when
 * an attempt fails (the composable keeps its previous `data` on error, but a
 * fresh mount's initial state is `undefined`, which must not erase the cache).
 */
function writeSwrResult(
  key: string,
  data: unknown,
  error: SolanaError | null | undefined,
  status: string,
): void {
  if (status === "disabled") {
    deleteSwrCache(key);

    return;
  }

  const previous = readSwrCache(key);

  writeSwrCache(key, {
    data: data !== undefined ? data : previous?.data,
    error,
    status,
  });
}

/**
 * `result.error` wins once this mount has settled. The seeded error is only
 * shown while a fresh attempt is still pending, so a later success clears the
 * previous mount's error instead of pinning it for the component's lifetime.
 */
function swrError(
  error: SolanaError | null,
  status: string,
  seed: SwrCacheEntry | undefined,
): SolanaError | null {
  if (status === "disabled") {
    return null;
  }

  return error ?? (isPendingStatus(status) ? (seed?.error ?? null) : null);
}

/**
 * `useRequest` with cache keying. A component mounting with a key that
 * already holds data shows it immediately (stale) while its own request
 * revalidates; results are written back for the next mount.
 *
 * A `null`/`undefined` source disables the request and **clears** the
 * cached entry for the key — including when the component mounts with the
 * source already disabled.
 */
export function useRequestSwr<TResult>(
  key: string,
  source: Parameters<typeof useRequest<TResult>>[0],
  options: UseRequestOptions = {},
): UseRequestReturn<TResult> {
  const cacheKey = `${PREFIX_REQUEST}${key}`;
  const seed = readSwrCache(cacheKey);
  const result = useRequest<TResult>(source, options);

  if (result.status.value === "disabled") {
    deleteSwrCache(cacheKey);
  }

  watch(
    [result.data, result.error, result.status],
    ([data, error, status]) => writeSwrResult(cacheKey, data, error, status),
    { flush: "sync" },
  );

  const data = computed<TResult | undefined>(() => {
    if (result.status.value === "disabled") {
      return undefined;
    }

    return result.data.value !== undefined
      ? result.data.value
      : (seed?.data as TResult | undefined);
  });
  const error = computed<SolanaError | null>(() =>
    swrError(result.error.value, result.status.value, seed),
  );

  return {
    data,
    error,
    refresh: result.refresh,
    status: result.status,
  };
}

/**
 * `useSubscription` with cache keying — a freshly mounted component seeds
 * from the last-known stream value while its own subscription connects.
 *
 * A `null`/`undefined` source disables the subscription and **clears** the
 * cached entry for the key.
 */
export function useSubscriptionSwr<TResult>(
  key: string,
  source: UseSubscriptionSource<TResult>,
  options: UseSubscriptionOptions = {},
): UseSubscriptionReturn<TResult> {
  const cacheKey = `${PREFIX_SUBSCRIPTION}${key}`;
  const seed = readSwrCache(cacheKey);
  const result = useSubscription<TResult>(source, options);

  if (result.status.value === "disabled") {
    deleteSwrCache(cacheKey);
  }

  watch(
    [result.data, result.error, result.status],
    ([data, error, status]) => writeSwrResult(cacheKey, data, error, status),
    { flush: "sync" },
  );

  const data = computed<TResult | undefined>(() => {
    if (result.status.value === "disabled") {
      return undefined;
    }

    return result.data.value !== undefined
      ? result.data.value
      : (seed?.data as TResult | undefined);
  });
  const error = computed<SolanaError | null>(() =>
    swrError(result.error.value, result.status.value, seed),
  );

  return {
    data,
    error,
    reconnect: result.reconnect,
    status: result.status,
  };
}

/**
 * `useTrackedData` with cache keying — seeds from the last-known
 * {@link SolanaRpcResponse} envelope (data **and** slot context) while the
 * fetch + subscription pair revalidates.
 *
 * A `null`/`undefined` source disables the composable and **clears** the
 * cached entry for the key.
 */
export function useTrackedDataSwr<TInitialValue, TStreamValue, TItem>(
  key: string,
  source: UseTrackedDataSource<TInitialValue, TStreamValue, TItem>,
  options: UseTrackedDataOptions = {},
): UseTrackedDataReturn<TItem> {
  const cacheKey = `${PREFIX_TRACKED}${key}`;
  const seed = readSwrCache(cacheKey);
  const result = useTrackedData<TInitialValue, TStreamValue, TItem>(source, options);

  if (result.status.value === "disabled") {
    deleteSwrCache(cacheKey);
  }

  watch(
    [result.data, result.error, result.status],
    ([data, error, status]) => writeSwrResult(cacheKey, data, error, status),
    { flush: "sync" },
  );

  const data = computed<SolanaRpcResponse<TItem> | undefined>(() => {
    if (result.status.value === "disabled") {
      return undefined;
    }

    return result.data.value ?? (seed?.data as SolanaRpcResponse<TItem> | undefined);
  });
  const error = computed<SolanaError | null>(() =>
    swrError(result.error.value, result.status.value, seed),
  );

  return {
    data,
    error,
    refresh: result.refresh,
    status: result.status,
  };
}
