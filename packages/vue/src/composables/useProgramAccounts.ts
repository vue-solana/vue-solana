import { parsePublicKey, type PublicKeyInput } from "@vue-solana/core/address";
import type { AccountInfo, Commitment, PublicKey } from "@solana/web3-compat";
import { onMounted, shallowRef, toValue, watch, type MaybeRefOrGetter } from "vue";
import { useConnection } from "./useConnection";
import { tryUseSolana } from "./useSolana";

export type ProgramAccountMemcmpFilter = {
  memcmp: {
    offset: number;
    bytes: string;
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

export interface ProgramAccount<TData extends Buffer = Buffer> {
  pubkey: PublicKey;
  account: AccountInfo<TData>;
}

export function useProgramAccounts(
  programId: MaybeRefOrGetter<PublicKeyInput>,
  options: UseProgramAccountsOptions = {},
) {
  const solana = tryUseSolana();
  const connection = solana?.connection ?? useConnection();
  const accounts = shallowRef<ProgramAccount[]>([]);
  const loading = shallowRef(false);
  const error = shallowRef<unknown>(null);
  let refreshId = 0;

  async function refresh() {
    const requestId = ++refreshId;
    const value = toValue(programId);

    if (!value || !solana) {
      accounts.value = [];
      loading.value = false;
      error.value = null;
      return [];
    }

    loading.value = true;
    error.value = null;

    try {
      const publicKey = parsePublicKey(value);

      if (!publicKey) {
        accounts.value = [];
        return [];
      }

      const nextAccounts = (await connection.getProgramAccounts(publicKey, {
        commitment: options.commitment,
        dataSlice: options.dataSlice,
        filters: options.filters,
      })) as ProgramAccount[];

      if (requestId === refreshId) {
        accounts.value = nextAccounts;
      }

      return nextAccounts;
    } catch (cause) {
      if (requestId === refreshId) {
        error.value = cause;
      }

      throw cause;
    } finally {
      if (requestId === refreshId) {
        loading.value = false;
      }
    }
  }

  onMounted(() => {
    void refresh().catch(() => undefined);
  });

  watch(
    () => toValue(programId),
    () => {
      void refresh().catch(() => undefined);
    },
  );

  return {
    accounts,
    loading,
    error,
    refresh,
  };
}
