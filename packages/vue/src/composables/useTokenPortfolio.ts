import type { Address, Commitment, ReactiveStreamStore } from "@vue-solana/core/kit";
import {
  getTokenPortfolio,
  type TokenPortfolioResult,
  type TokenPortfolioTotals,
} from "@vue-solana/core/token-portfolio";
import { computed, toValue, watch, type ComputedRef, type MaybeRefOrGetter } from "vue";
import { useRequest, type UseRequestReturn } from "./useRequest";
import { useSubscription } from "./useSubscription";
import { useSolanaClient } from "./useSolanaClient";
import { tryUseSolana } from "./useSolana";

const EMPTY_ITEMS: TokenPortfolioResult["accounts"] = [];
const EMPTY_BY_MINT: TokenPortfolioResult["byMint"] = {};
const EMPTY_TOTALS: TokenPortfolioTotals = { accounts: 0, mints: 0 };

export interface UseTokenPortfolioOptions {
  commitment?: Commitment;
  /**
   * Re-read the portfolio when a new slot notification arrives. Defaults to
   * true, and silently disables itself when the installed client has no
   * `rpcSubscriptions.slotNotifications()`.
   */
  invalidateOnSlot?: boolean;
  /**
   * Read Token-2022 accounts instead of classic SPL accounts. The 2022 helper
   * is imported dynamically so the default graph stays classic-only.
   */
  includeToken2022?: boolean;
}

export interface UseTokenPortfolioReturn {
  byMint: ComputedRef<TokenPortfolioResult["byMint"]>;
  error: UseRequestReturn<TokenPortfolioResult>["error"];
  items: ComputedRef<TokenPortfolioResult["accounts"]>;
  loading: ComputedRef<boolean>;
  portfolio: UseRequestReturn<TokenPortfolioResult>["data"];
  refresh: UseRequestReturn<TokenPortfolioResult>["refresh"];
  status: UseRequestReturn<TokenPortfolioResult>["status"];
  totals: ComputedRef<TokenPortfolioTotals>;
}

/**
 * Reactive, read-only view of the token accounts an owner holds.
 *
 * The owner is watched; an unconfigured owner clears the view without an RPC
 * call. Reads are superseded by newer ones and abortable, and a slot
 * subscription invalidates the view when the client supports it. Prices,
 * metadata, and mutations are deliberately out of scope.
 */
export function useTokenPortfolio(
  owner: MaybeRefOrGetter<Address | string | null | undefined>,
  options: UseTokenPortfolioOptions = {},
): UseTokenPortfolioReturn {
  const solana = tryUseSolana();
  const client = solana?.client ?? useSolanaClient().client;

  async function readPortfolio(
    currentOwner: Address | string,
    abortSignal: AbortSignal,
  ): Promise<TokenPortfolioResult> {
    const readOptions = { commitment: options.commitment, abortSignal };

    if (options.includeToken2022) {
      // Opt-in path: never statically pull the 2022 helper into the classic graph.
      const { getTokenPortfolio2022 } = await import("@vue-solana/core/token-portfolio-2022");

      return getTokenPortfolio2022(client, currentOwner, readOptions);
    }

    return getTokenPortfolio(client, currentOwner, readOptions);
  }

  const source = computed<((signal: AbortSignal) => Promise<TokenPortfolioResult>) | null>(() => {
    const currentOwner = toValue(owner);

    return currentOwner ? (signal) => readPortfolio(currentOwner, signal) : null;
  });
  const request = useRequest(source);

  const subscriptionSource = computed<{ reactiveStore: () => ReactiveStreamStore<unknown> } | null>(
    () => {
      if (options.invalidateOnSlot === false) {
        return null;
      }

      const rpcSubscriptions = (client as { rpcSubscriptions?: Record<string, unknown> })
        .rpcSubscriptions;

      if (typeof rpcSubscriptions?.slotNotifications !== "function") {
        return null;
      }

      return rpcSubscriptions.slotNotifications() as {
        reactiveStore: () => ReactiveStreamStore<unknown>;
      };
    },
  );
  const slots = useSubscription<unknown>(subscriptionSource);

  watch(slots.data, () => {
    if (request.status.value !== "fetching" && request.status.value !== "disabled") {
      void request.refresh().catch(() => undefined);
    }
  });

  return {
    byMint: computed(() => request.data.value?.byMint ?? EMPTY_BY_MINT),
    error: request.error,
    items: computed(() => request.data.value?.accounts ?? EMPTY_ITEMS),
    loading: computed(() => request.status.value === "fetching"),
    portfolio: request.data,
    refresh: request.refresh,
    status: request.status,
    totals: computed(() => request.data.value?.totals ?? EMPTY_TOTALS),
  };
}
