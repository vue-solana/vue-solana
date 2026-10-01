import type { Commitment } from "@vue-solana/core/kit";
import { type MaybeRefOrGetter } from "vue";
import { useConnection } from "./useConnection";
import { useAddressRead } from "./use-address-read";
import { tryUseSolana } from "./useSolana";

export type BalanceInput = string | null | undefined;

export function useBalance(address: MaybeRefOrGetter<BalanceInput>, commitment?: Commitment) {
  const solana = tryUseSolana();
  const client = solana?.client ?? useConnection();

  const { data: balance, ...rest } = useAddressRead(
    [address],
    async (key) =>
      (await client.rpc.getBalance(key, commitment ? { commitment } : undefined).send()).value,
    Number,
    null,
  );

  return { balance, ...rest };
}
