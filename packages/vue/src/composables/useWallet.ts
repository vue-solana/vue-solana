import { createNoWalletSelectedError } from "@vue-solana/core/wallet";
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
      throw createNoWalletSelectedError();
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
  const canConnect = computed(() => Boolean(wallet.value?.connect));
  const canDisconnect = computed(() => Boolean(wallet.value?.disconnect));
  const canSignMessage = computed(() => Boolean(wallet.value?.signMessage));
  const canSignTransaction = computed(() => Boolean(wallet.value?.signTransaction));
  const canSignAllTransactions = computed(() => Boolean(wallet.value?.signAllTransactions));
  const canSignAndSendTransaction = computed(() => Boolean(wallet.value?.signAndSendTransaction));
  const capabilities = computed(() => ({
    connect: canConnect.value,
    disconnect: canDisconnect.value,
    signMessage: canSignMessage.value,
    signTransaction: canSignTransaction.value,
    signAllTransactions: canSignAllTransactions.value,
    signAndSendTransaction: canSignAndSendTransaction.value,
  }));

  return {
    wallet,
    publicKey: computed(() => wallet.value?.publicKey ?? null),
    connected: computed(() => Boolean(wallet.value?.connected && wallet.value.publicKey)),
    connecting: isConnecting,
    disconnecting: isDisconnecting,
    loading: computed(() => isConnecting.value || isDisconnecting.value),
    capabilities,
    canConnect,
    canDisconnect,
    canSignMessage,
    canSignTransaction,
    canSignAllTransactions,
    canSignAndSendTransaction,
    setWallet: solana.setWallet,
    connect,
    disconnect,
  };
}
