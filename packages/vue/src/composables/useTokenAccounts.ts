import type { Commitment, PublicKey } from "@vue-solana/core/web3";
import type { TokenAccount } from "@vue-solana/core/spl-token";
import { parsePublicKey } from "@vue-solana/core/address";
import { normalizeSolanaError, type SolanaError } from "@vue-solana/core/errors";
import {
  getTokenAccountsByOwner,
  type TokenAccountsByOwnerOptions,
} from "@vue-solana/core/token-accounts";
import { onMounted, shallowRef, toValue, watch, type MaybeRefOrGetter } from "vue";
import { useConnection } from "./useConnection";
import { tryUseSolana } from "./useSolana";

export interface UseTokenAccountsOptions {
  commitment?: Commitment;
  programId?: PublicKey;
}

export function useTokenAccounts(
  owner: MaybeRefOrGetter<PublicKey | string | null | undefined>,
  options?: UseTokenAccountsOptions,
) {
  const solana = tryUseSolana();
  const connection = solana?.connection ?? useConnection();
  const tokenAccounts = shallowRef<TokenAccount[]>([]);
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
      const publicKey = parsePublicKey(value);

      if (!publicKey) {
        tokenAccounts.value = [];
        loading.value = false;
        return [];
      }

      const opts: TokenAccountsByOwnerOptions = {
        commitment: options?.commitment as TokenAccountsByOwnerOptions["commitment"],
        programId: options?.programId,
      };

      const nextAccounts = await getTokenAccountsByOwner(connection, publicKey, opts);

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
