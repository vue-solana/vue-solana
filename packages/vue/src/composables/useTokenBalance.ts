import type { Commitment } from "@vue-solana/core/kit";
import { getTokenBalance } from "@vue-solana/core/token-accounts";
import { normalizeSolanaError, type SolanaError } from "@vue-solana/core/errors";
import { parseAddress } from "@vue-solana/core/address";
import { onMounted, shallowRef, toValue, watch, type MaybeRefOrGetter } from "vue";
import { useConnection } from "./useConnection";
import { tryUseSolana } from "./useSolana";

export function useTokenBalance(
  mint: MaybeRefOrGetter<string | null | undefined>,
  owner: MaybeRefOrGetter<string | null | undefined>,
  commitment?: Commitment,
) {
  const solana = tryUseSolana();
  const client = solana?.client ?? useConnection();
  const balance = shallowRef<bigint | null>(null);
  const decimals = shallowRef<number | null>(null);
  const loading = shallowRef(false);
  const error = shallowRef<SolanaError | null>(null);
  let refreshId = 0;

  async function refresh() {
    const requestId = ++refreshId;
    const mintValue = toValue(mint);
    const ownerValue = toValue(owner);

    if (!mintValue || !ownerValue || !solana) {
      balance.value = null;
      decimals.value = null;
      loading.value = false;
      error.value = null;
      return null;
    }

    loading.value = true;
    error.value = null;

    try {
      const mintKey = parseAddress(mintValue);
      const ownerKey = parseAddress(ownerValue);

      if (!mintKey || !ownerKey) {
        balance.value = null;
        decimals.value = null;
        loading.value = false;
        return null;
      }

      const nextBalance = await getTokenBalance(client, mintKey, ownerKey, commitment);

      if (requestId === refreshId) {
        balance.value = nextBalance?.amount ?? null;
        decimals.value = nextBalance?.decimals ?? null;
      }

      return nextBalance;
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
    () => [toValue(mint), toValue(owner)],
    () => {
      void refresh().catch(() => undefined);
    },
  );

  return {
    balance,
    decimals,
    loading,
    error,
    refresh,
  };
}
