import type { Commitment } from "@vue-solana/core/kit";
import type { MaybeRefOrGetter } from "vue";
import { useConnection } from "./useConnection";
import { useAddressRead } from "./use-address-read";
import { tryUseSolana } from "./useSolana";
import { decodeBase64 } from "./decode-base64";

export type ProgramAccountMemcmpEncoding = "base58" | "base64";

export type ProgramAccountMemcmpFilter = {
  memcmp: {
    offset: number;
    bytes: string;
    encoding?: ProgramAccountMemcmpEncoding;
  };
};

export type ProgramAccountDataSizeFilter = {
  dataSize: number;
};

export type ProgramAccountFilter = ProgramAccountMemcmpFilter | ProgramAccountDataSizeFilter;

export interface ProgramAccountDataSlice {
  offset: number;
  length: number;
}

export interface UseProgramAccountsOptions {
  commitment?: Commitment;
  dataSlice?: ProgramAccountDataSlice;
  filters?: ProgramAccountFilter[];
}

export interface ProgramAccount {
  pubkey: string;
  account: {
    executable: boolean;
    lamports: number;
    owner: string;
    space: number;
    data: Uint8Array;
  };
}

export function useProgramAccounts(
  programId: MaybeRefOrGetter<string | null | undefined>,
  options: UseProgramAccountsOptions = {},
) {
  // Per instance, not module level: `accounts.value` is handed out for in-place
  // mutation, and a shared sentinel would let one instance corrupt every other.
  const empty: ProgramAccount[] = [];
  const solana = tryUseSolana();
  const client = solana?.client ?? useConnection();

  const { data: accounts, ...rest } = useAddressRead(
    [programId],
    async (key) =>
      (
        await client.rpc
          .getProgramAccounts(key, {
            encoding: "base64",
            commitment: options.commitment,
            dataSlice: options.dataSlice,
            filters: options.filters,
          } as never)
          .send()
      ).value,
    (response) =>
      response.map(({ pubkey, account }) => ({
        pubkey,
        account: {
          executable: account.executable,
          lamports: Number(account.lamports),
          owner: account.owner,
          space: Number(account.space),
          data: decodeBase64(account.data[0]),
        },
      })),
    empty,
  );

  return { accounts, ...rest };
}
