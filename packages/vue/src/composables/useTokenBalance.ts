import type { Commitment } from "@vue-solana/core/kit";
import type { TokenBalanceResult } from "@vue-solana/core/token-accounts";
import { getTokenBalance } from "@vue-solana/core/token-accounts";
import { computed, type MaybeRefOrGetter } from "vue";
import { useConnection } from "./useConnection";
import { useAddressRead } from "./use-address-read";
import { tryUseSolana } from "./useSolana";

export function useTokenBalance(
  mint: MaybeRefOrGetter<string | null | undefined>,
  owner: MaybeRefOrGetter<string | null | undefined>,
  commitment?: Commitment,
) {
  // Per instance, not module level: `balance`/`decimals` are computed off this
  // object, and a shared sentinel would let one instance mutate what every other
  // instance reports.
  const empty: { balance: bigint | null; decimals: number | null } = {
    balance: null,
    decimals: null,
  };
  const solana = tryUseSolana();
  const client = solana?.client ?? useConnection();

  const read = useAddressRead(
    [mint, owner],
    (mintKey, ownerKey) => getTokenBalance(client, mintKey, ownerKey, commitment),
    (result: TokenBalanceResult | null) => ({
      balance: result?.amount ?? null,
      decimals: result?.decimals ?? null,
    }),
    empty,
  );

  return {
    balance: computed(() => read.data.value.balance),
    decimals: computed(() => read.data.value.decimals),
    loading: read.loading,
    error: read.error,
    refresh: read.refresh,
  };
}
