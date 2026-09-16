import type { Address, Commitment } from "@vue-solana/core/kit";
import type { TokenAccountInfo } from "@vue-solana/core/token-accounts";
import { getTokenAccountsByOwner } from "@vue-solana/core/token-accounts";
import { normalizeSolanaError, type SolanaError } from "@vue-solana/core/errors";
import { parseAddress } from "@vue-solana/core/address";
import { onMounted, shallowRef, toValue, watch, type MaybeRefOrGetter } from "vue";
import { useConnection } from "./useConnection";
import { tryUseSolana } from "./useSolana";

export interface UseTokenAccountsOptions {
  commitment?: Commitment;
  programId?: Address;
}

export function useTokenAccounts(
  owner: MaybeRefOrGetter<Address | string | null | undefined>,
  options?: UseTokenAccountsOptions,
) {
  const solana = tryUseSolana();
  const client = solana?.client ?? useConnection();
  const tokenAccounts = shallowRef<TokenAccountInfo[]>([]);
  const loading = shallowRef(false);
  const error = shallowRef<SolanaError | null>(null);
  let refreshId = 0;

  async function refresh() {
    const requestId = ++refreshId;
    const value = toValue(owner);

    if (!value || !solana) {
      tokenAccounts.value = [];
      loading.value = false;
      error.value = null;
      return null;
    }

    loading.value = true;
    error.value = null;

    try {
      const parsedAddress = parseAddress(value);

      if (!parsedAddress) {
        tokenAccounts.value = [];
        loading.value = false;
        return [];
      }

      const nextAccounts = await getTokenAccountsByOwner(client, parsedAddress, {
        commitment: options?.commitment,
        programId: options?.programId,
      });

      if (requestId === refreshId) {
        tokenAccounts.value = nextAccounts;
      }

      return nextAccounts;
    } catch (cause) {
      const normalizedError = normalizeSolanaError(cause, "RPC_FAILURE");

      if (requestId === refreshId) {
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

  watch(
    () => toValue(owner),
    () => {
      void refresh().catch(() => undefined);
    },
  );

  return {
    tokenAccounts,
    loading,
    error,
    refresh,
  };
}
