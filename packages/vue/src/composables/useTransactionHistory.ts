import type { Address } from "@vue-solana/core/kit";
import { normalizeSolanaError, type SolanaError } from "@vue-solana/core/errors";
import { getTransactionHistory } from "@vue-solana/core/transaction-history";
import type { TransactionHistoryOptions, TransactionHistoryResult } from "@vue-solana/core/types";
import {
  computed,
  onScopeDispose,
  shallowRef,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
  type ShallowRef,
} from "vue";
import { MissingClientCapabilityError } from "./useClientCapability";
import { useSolanaClient } from "./useSolanaClient";

export type TransactionHistoryStatus = "idle" | "loading" | "loaded" | "error";

export type UseTransactionHistoryOptions = Omit<
  TransactionHistoryOptions,
  "before" | "abortSignal"
> & {
  /** Fetch page 1 during setup. Defaults to `true`. */
  immediate?: boolean;
};

export interface UseTransactionHistory {
  data: ShallowRef<TransactionHistoryResult | null>;
  items: ComputedRef<TransactionHistoryResult["items"]>;
  hasMore: ComputedRef<boolean>;
  error: ShallowRef<SolanaError | null>;
  loading: ComputedRef<boolean>;
  loadingMore: ShallowRef<boolean>;
  status: ShallowRef<TransactionHistoryStatus>;
  refresh: () => Promise<TransactionHistoryResult | null>;
  loadMore: () => Promise<TransactionHistoryResult | null>;
  reset: () => void;
}

const PROVIDER_HINT =
  "Use a client created by `createSolanaClient()`, whose RPC exposes Kit's standard `getSignaturesForAddress` method.";

/**
 * Paginated signature history for a reactive address source.
 *
 * `refresh()` replaces page 1 and supersedes every in-flight request.
 * `loadMore()` appends the next older page using the cursor from `data`.
 * Both abort their previous request, and scope disposal aborts everything.
 */
export function useTransactionHistory(
  addressSource: MaybeRefOrGetter<Address | string | null | undefined>,
  options: MaybeRefOrGetter<UseTransactionHistoryOptions> = {},
): UseTransactionHistory {
  const { client } = useSolanaClient();

  if (typeof client.rpc?.getSignaturesForAddress !== "function") {
    throw new MissingClientCapabilityError(
      "useTransactionHistory",
      ["rpc.getSignaturesForAddress"],
      PROVIDER_HINT,
    );
  }

  const data = shallowRef<TransactionHistoryResult | null>(null);
  const error = shallowRef<SolanaError | null>(null);
  const status = shallowRef<TransactionHistoryStatus>("idle");
  const loadingMore = shallowRef(false);
  const items = computed(() => data.value?.items ?? []);
  const hasMore = computed(() => data.value?.hasMore ?? false);
  const loading = computed(() => status.value === "loading");

  let refreshId = 0;
  let moreId = 0;
  let refreshController: AbortController | undefined;
  let moreController: AbortController | undefined;

  function invalidateMore() {
    moreId += 1;
    moreController?.abort();
    moreController = undefined;
    loadingMore.value = false;
  }

  async function refresh(): Promise<TransactionHistoryResult | null> {
    const id = ++refreshId;
    const address = toValue(addressSource);
    const { limit, commitment, until } = toValue(options);
    const requestOptions = { limit, commitment, until };

    invalidateMore();
    refreshController?.abort();
    refreshController = new AbortController();
    const abortSignal = refreshController.signal;

    if (!address) {
      data.value = null;
      error.value = null;
      status.value = "idle";
      return null;
    }

    status.value = "loading";
    error.value = null;
    data.value = null;

    try {
      const result = await getTransactionHistory(client, address, {
        ...requestOptions,
        abortSignal,
      });

      if (id === refreshId) {
        data.value = result;
        status.value = "loaded";
      }

      return result;
    } catch (cause) {
      const normalized = normalizeSolanaError(cause, "RPC_FAILURE");

      if (id === refreshId && !abortSignal.aborted) {
        error.value = normalized;
        status.value = "error";
      }

      throw normalized;
    }
  }

  async function loadMore(): Promise<TransactionHistoryResult | null> {
    const current = data.value;

    if (
      !current?.hasMore ||
      !current.nextBefore ||
      status.value === "loading" ||
      loadingMore.value
    ) {
      return current;
    }

    const address = toValue(addressSource);

    if (!address) {
      return current;
    }

    const id = ++moreId;
    const refreshGeneration = refreshId;
    const { limit, commitment, until } = toValue(options);
    const requestOptions = { limit, commitment, until };
    const controller = new AbortController();
    moreController = controller;
    loadingMore.value = true;
    error.value = null;

    let merged: TransactionHistoryResult | undefined;

    try {
      const page = await getTransactionHistory(client, address, {
        ...requestOptions,
        before: current.nextBefore,
        abortSignal: controller.signal,
      });

      if (id === moreId && refreshGeneration === refreshId) {
        merged = {
          items: [...current.items, ...page.items],
          hasMore: page.hasMore,
          ...(page.nextBefore ? { nextBefore: page.nextBefore } : {}),
        };
        data.value = merged;
        status.value = "loaded";
      }

      return merged ?? null;
    } catch (cause) {
      const normalized = normalizeSolanaError(cause, "RPC_FAILURE");

      if (id === moreId && refreshGeneration === refreshId) {
        error.value = normalized;
        status.value = "error";
      }

      throw normalized;
    } finally {
      if (id === moreId) {
        loadingMore.value = false;
        moreController = undefined;
      }
    }
  }

  function reset() {
    refreshId += 1;
    invalidateMore();
    refreshController?.abort();
    refreshController = undefined;
    data.value = null;
    error.value = null;
    status.value = "idle";
  }

  watch(
    [
      () => toValue(addressSource),
      () => toValue(options).limit,
      () => toValue(options).commitment,
      () => toValue(options).until,
    ],
    () => {
      void refresh().catch(() => undefined);
    },
    { immediate: toValue(options).immediate ?? true },
  );

  onScopeDispose(() => {
    refreshId += 1;
    invalidateMore();
    refreshController?.abort();
    refreshController = undefined;
  });

  return {
    data,
    error,
    hasMore,
    items,
    loadMore,
    loading,
    loadingMore,
    refresh,
    reset,
    status,
  };
}
