import type { Address, Commitment, ReactiveStreamStore } from "@vue-solana/core/kit";
import {
  getTokenPortfolio,
  type TokenPortfolioResult,
  type TokenPortfolioTotals,
} from "@vue-solana/core/token-portfolio";
import { computed, toValue, watch, type ComputedRef, type MaybeRefOrGetter } from "vue";
import { useRequest, type UseRequestReturn } from "./useRequest";
import { useSubscription, type UseSubscriptionStatus } from "./useSubscription";
import { useSolanaClient } from "./useSolanaClient";
import { tryUseSolana } from "./useSolana";

export interface UseTokenPortfolioOptions {
  /** Read with this commitment. Reactive values re-fire the read when changed. */
  commitment?: MaybeRefOrGetter<Commitment | undefined>;
  /**
   * Re-read the portfolio when a new slot notification arrives. Defaults to
   * true, and silently disables itself when the installed client has no
   * `rpcSubscriptions.slotNotifications()`. Reactive values are supported.
   */
  invalidateOnSlot?: MaybeRefOrGetter<boolean | undefined>;
  /**
   * Read Token-2022 accounts instead of classic SPL accounts. The 2022 helper
   * is imported dynamically so the default graph stays classic-only. Reactive
   * values re-fire the read when changed.
   */
  includeToken2022?: MaybeRefOrGetter<boolean | undefined>;
}

export interface UseTokenPortfolioReturn {
  byMint: ComputedRef<TokenPortfolioResult["byMint"]>;
  error: UseRequestReturn<TokenPortfolioResult>["error"];
  items: ComputedRef<TokenPortfolioResult["accounts"]>;
  loading: ComputedRef<boolean>;
  portfolio: UseRequestReturn<TokenPortfolioResult>["data"];
  refresh: UseRequestReturn<TokenPortfolioResult>["refresh"];
  /** Error from the optional slot subscription used for invalidation. */
  slotError: UseRequestReturn<TokenPortfolioResult>["error"];
  /** Status of the optional slot subscription (`disabled` when not used). */
  slotStatus: ComputedRef<UseSubscriptionStatus>;
  status: UseRequestReturn<TokenPortfolioResult>["status"];
  totals: ComputedRef<TokenPortfolioTotals>;
}

/**
 * Reactive, read-only view of the token accounts an owner holds.
 *
 * The owner is watched; an unconfigured owner clears the view without an RPC
 * call. Reads are superseded by newer ones and abortable, and a slot
 * subscription invalidates the view when the client supports it. Data is only
 * exposed after a successful read, so a failed refresh or a changed owner never
 * shows the previous owner's balances next to a fresh error. Prices, metadata,
 * and mutations are deliberately out of scope.
 */
export function useTokenPortfolio(
  owner: MaybeRefOrGetter<Address | string | null | undefined>,
  options: UseTokenPortfolioOptions = {},
): UseTokenPortfolioReturn {
  // Per instance, not module level: callers can mutate the returned arrays and
  // objects, and a shared sentinel would leak one instance's changes into all
  // others (including across SSR requests).
  const emptyItems: TokenPortfolioResult["accounts"] = [];
  const emptyByMint: TokenPortfolioResult["byMint"] = {};
  const emptyTotals: TokenPortfolioTotals = { accounts: 0, mints: 0 };

  const solana = tryUseSolana();
  const client = solana?.client ?? useSolanaClient().client;

  async function readPortfolio(
    currentOwner: Address | string,
    commitment: Commitment | undefined,
    includeToken2022: boolean | undefined,
    abortSignal: AbortSignal,
  ): Promise<TokenPortfolioResult> {
    const readOptions = { commitment, abortSignal };

    if (includeToken2022) {
      // Opt-in path: never statically pull the 2022 helper into the classic graph.
      const { getTokenPortfolio2022 } = await import("@vue-solana/core/token-portfolio-2022");

      return getTokenPortfolio2022(client, currentOwner, readOptions);
    }

    return getTokenPortfolio(client, currentOwner, readOptions);
  }

  const source = computed<((signal: AbortSignal) => Promise<TokenPortfolioResult>) | null>(() => {
    const currentOwner = toValue(owner);

    if (!currentOwner) {
      return null;
    }

    // Read options inside the computed so refs/getters become part of the
    // source identity and changes re-fire the read like an owner change does.
    const commitment = toValue(options.commitment);
    const includeToken2022 = toValue(options.includeToken2022);

    return (signal) => readPortfolio(currentOwner, commitment, includeToken2022, signal);
  });
  const request = useRequest(source);

  const subscriptionSource = computed<{ reactiveStore: () => ReactiveStreamStore<unknown> } | null>(
    () => {
      if (toValue(options.invalidateOnSlot) === false || !toValue(owner)) {
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

  let dirtyWhileFetching = false;

  function refreshFromSlot() {
    if (request.status.value === "disabled" || slots.status.value === "disabled") {
      return;
    }

    if (request.status.value === "fetching") {
      dirtyWhileFetching = true;
      return;
    }

    void request.refresh().catch(() => undefined);
  }

  watch(slots.data, refreshFromSlot);

  watch(request.status, (status) => {
    if (status === "fetching") {
      return;
    }

    if (status === "success" && dirtyWhileFetching) {
      dirtyWhileFetching = false;
      refreshFromSlot();
      return;
    }

    dirtyWhileFetching = false;
  });

  const portfolio = computed(() =>
    request.status.value === "success" ? request.data.value : undefined,
  );

  return {
    byMint: computed(() => portfolio.value?.byMint ?? emptyByMint),
    error: request.error,
    items: computed(() => portfolio.value?.accounts ?? emptyItems),
    loading: computed(() => request.status.value === "fetching"),
    portfolio,
    refresh: request.refresh,
    slotError: slots.error,
    slotStatus: slots.status,
    status: request.status,
    totals: computed(() => portfolio.value?.totals ?? emptyTotals),
  };
}
