import type { Address, Commitment } from "@vue-solana/core/kit";
import type { TokenAccountInfo } from "@vue-solana/core/token-accounts";
import { getTokenAccountsByOwner } from "@vue-solana/core/token-accounts";
import type { MaybeRefOrGetter } from "vue";
import { useConnection } from "./useConnection";
import { useAddressRead } from "./use-address-read";
import { tryUseSolana } from "./useSolana";

export interface UseTokenAccountsOptions {
  commitment?: Commitment;
  programId?: Address;
}

export function useTokenAccounts(
  owner: MaybeRefOrGetter<Address | string | null | undefined>,
  options?: UseTokenAccountsOptions,
) {
  // Per instance, not module level: `tokenAccounts.value` is handed out for
  // in-place mutation, and a shared sentinel would let one instance corrupt
  // every other.
  const empty: TokenAccountInfo[] = [];
  const solana = tryUseSolana();
  const client = solana?.client ?? useConnection();

  const { data: tokenAccounts, ...rest } = useAddressRead(
    [owner],
    (key) =>
      getTokenAccountsByOwner(client, key, {
        commitment: options?.commitment,
        programId: options?.programId,
      }),
    (accounts) => accounts,
    empty,
  );

  return { tokenAccounts, ...rest };
}
