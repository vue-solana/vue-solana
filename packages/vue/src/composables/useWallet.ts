import { computed, ref, triggerRef } from "vue";
import { useSolana } from "./useSolana";

export function useWallet() {
  const solana = useSolana();
  const wallet = solana.wallet;
  const connecting = ref(false);
  const disconnecting = ref(false);

  async function connect() {
    const activeWallet = wallet.value;

    if (!activeWallet) {
      throw new Error("No Solana wallet is configured");
    }

    connecting.value = true;

    try {
      const connection = activeWallet.connect();

      triggerRef(wallet);
      await connection;
      triggerRef(wallet);

      console.info("[Vue Solana] Wallet connected", {
        publicKey: activeWallet.publicKey?.toBase58() ?? null,
      });
    } catch (error) {
      triggerRef(wallet);
      console.error("[Vue Solana] Wallet connection failed", error);
      throw error;
    } finally {
      connecting.value = false;
    }
  }

  async function disconnect() {
    const activeWallet = wallet.value;

    if (!activeWallet) {
      return;
    }

    const publicKey = activeWallet.publicKey?.toBase58() ?? null;

    disconnecting.value = true;

    try {
      await activeWallet.disconnect();
      triggerRef(wallet);

      console.info("[Vue Solana] Wallet disconnected", { publicKey });
    } catch (error) {
      triggerRef(wallet);
      console.error("[Vue Solana] Wallet disconnection failed", error);
      throw error;
    } finally {
      disconnecting.value = false;
    }
  }

  const isConnecting = computed(() => Boolean(connecting.value || wallet.value?.connecting));
  const isDisconnecting = computed(() =>
    Boolean(disconnecting.value || wallet.value?.disconnecting),
  );

  return {
    wallet,
    publicKey: computed(() => wallet.value?.publicKey ?? null),
    connected: computed(() => Boolean(wallet.value?.connected && wallet.value.publicKey)),
    connecting: isConnecting,
    disconnecting: isDisconnecting,
    loading: computed(() => isConnecting.value || isDisconnecting.value),
    setWallet: solana.setWallet,
    connect,
    disconnect,
  };
}
