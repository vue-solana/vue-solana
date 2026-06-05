import { computed } from "vue";
import { useSolana } from "./useSolana";

export function useWallet() {
  const solana = useSolana();
  const wallet = solana.wallet;

  return {
    wallet,
    publicKey: computed(() => wallet.value?.publicKey ?? null),
    connected: computed(() => Boolean(wallet.value?.connected && wallet.value.publicKey)),
    connecting: computed(() => Boolean(wallet.value?.connecting)),
    setWallet: solana.setWallet,
    connect: () =>
      wallet.value?.connect() ?? Promise.reject(new Error("No Solana wallet is configured")),
    disconnect: () => wallet.value?.disconnect() ?? Promise.resolve(),
  };
}
