import { PublicKey, type Commitment } from "@solana/web3-compat";
import { ref, toValue, watch, type MaybeRefOrGetter } from "vue";
import { useConnection } from "./useConnection";

export function useBalance(
  address: MaybeRefOrGetter<PublicKey | string | null | undefined>,
  commitment?: Commitment,
) {
  const connection = useConnection();
  const balance = ref<number | null>(null);
  const loading = ref(false);
  const error = ref<unknown>(null);

  async function refresh() {
    const value = toValue(address);

    if (!value) {
      balance.value = null;
      return null;
    }

    loading.value = true;
    error.value = null;

    try {
      const publicKey = typeof value === "string" ? new PublicKey(value) : value;
      balance.value = await connection.getBalance(publicKey, commitment);
      return balance.value;
    } catch (cause) {
      error.value = cause;
      throw cause;
    } finally {
      loading.value = false;
    }
  }

  watch(
    () => toValue(address),
    () => {
      void refresh();
    },
    { immediate: true },
  );

  return {
    balance,
    loading,
    error,
    refresh,
  };
}
