import type { Commitment } from "@vue-solana/core/kit";
import { normalizeSolanaError, type SolanaError } from "@vue-solana/core/errors";
import { onMounted, onUnmounted, shallowRef, toValue, watch, type MaybeRefOrGetter } from "vue";
import { parseAddress } from "@vue-solana/core/address";
import { useConnection } from "./useConnection";
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
  const solana = tryUseSolana();
  const client = solana?.client ?? useConnection();
  const accounts = shallowRef<ProgramAccount[]>([]);
  const loading = shallowRef(false);
  const error = shallowRef<SolanaError | null>(null);
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
      const parsedAddress = parseAddress(value);

      if (!parsedAddress) {
        accounts.value = [];
        return [];
      }

      const { value: response } = await client.rpc
        .getProgramAccounts(parsedAddress, {
          encoding: "base64",
          commitment: options.commitment,
          dataSlice: options.dataSlice,
          filters: options.filters,
        } as never)
        .send();
      const nextAccounts = response.map(({ pubkey, account }) => ({
        pubkey,
        account: {
          executable: account.executable,
          lamports: Number(account.lamports),
          owner: account.owner,
          space: Number(account.space),
          data: decodeBase64(account.data[0]),
        },
      }));

      if (requestId === refreshId) {
        accounts.value = nextAccounts;
      }

      return nextAccounts;
    } catch (cause) {
      const normalizedError = normalizeSolanaError(cause, "RPC_FAILURE");

      if (requestId === refreshId) {
        accounts.value = [];
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

  onUnmounted(() => {
    refreshId += 1;
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
