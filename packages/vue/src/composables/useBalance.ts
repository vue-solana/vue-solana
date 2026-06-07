import type { Commitment, PublicKey } from "@solana/web3-compat";
import { onMounted, ref, toValue, watch, type MaybeRefOrGetter } from "vue";
import { useConnection } from "./useConnection";
import { tryUseSolana } from "./useSolana";

export function useBalance(
  address: MaybeRefOrGetter<PublicKey | string | null | undefined>,
  commitment?: Commitment,
) {
  const solana = tryUseSolana();
  const connection = solana?.connection ?? useConnection();
  const balance = ref<number | null>(null);
  const loading = ref(false);
  const error = ref<unknown>(null);

  async function refresh() {
    const value = toValue(address);

    if (!value || !solana) {
      balance.value = null;
      return null;
    }

    loading.value = true;
    error.value = null;

    try {
      const publicKey =
        typeof value === "string"
          ? new (await import("@solana/web3-compat")).PublicKey(value)
          : value;
      balance.value = await connection.getBalance(publicKey, commitment);
      return balance.value;
    } catch (cause) {
      error.value = cause;
      throw cause;
    } finally {
      loading.value = false;
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
