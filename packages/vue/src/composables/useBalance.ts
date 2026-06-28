import { PublicKey, type Commitment } from "@solana/web3-compat";
import { onMounted, shallowRef, toValue, watch, type MaybeRefOrGetter } from "vue";
import { useConnection } from "./useConnection";
import { tryUseSolana } from "./useSolana";

export function useBalance(
  address: MaybeRefOrGetter<PublicKey | string | null | undefined>,
  commitment?: Commitment,
) {
  const solana = tryUseSolana();
  const connection = solana?.connection ?? useConnection();
  const balance = shallowRef<number | null>(null);
  const loading = shallowRef(false);
  const error = shallowRef<unknown>(null);
  let refreshId = 0;

  async function refresh() {
    const requestId = ++refreshId;
    const value = toValue(address);

    if (!value || !solana) {
      balance.value = null;
      loading.value = false;
      error.value = null;
      return null;
    }

    loading.value = true;
    error.value = null;

    try {
      const publicKey = typeof value === "string" ? new PublicKey(value) : value;
      const nextBalance = await connection.getBalance(publicKey, commitment);

      if (requestId === refreshId) {
        balance.value = nextBalance;
      }

      return nextBalance;
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
    () => toValue(address),
    () => {
      void refresh().catch(() => undefined);
    },
  );

  return {
    balance,
    loading,
    error,
    refresh,
  };
}
