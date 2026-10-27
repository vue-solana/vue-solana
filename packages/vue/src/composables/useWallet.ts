import { normalizeSolanaError } from "@vue-solana/core/errors";
import { assertWalletConnected, createNoWalletSelectedError } from "@vue-solana/core/wallet";
import { computed, ref, triggerRef } from "vue";
import { useSolana } from "./useSolana";

export function useWallet() {
  const solana = useSolana();
  const wallet = solana.wallet;
  const connecting = ref(false);
  const disconnecting = ref(false);

  // The context `error` ref is shared with `checkConnection()` and the plugin's
  // boot paths. A wallet failure reported there (auto-connect, mobile-wallet
  // registration, iOS callback) is stale once the user successfully connects,
  // so clear it without touching an unrelated RPC or storage error.
  function clearWalletError() {
    const current = solana.error.value;

    if (current?.code === "WALLET_FAILURE" || current?.code === "USER_REJECTED") {
      solana.error.value = null;
    }
  }

  async function connect() {
    if (connecting.value || wallet.value?.connecting) {
      return;
    }

    const activeWallet = wallet.value;

    if (!activeWallet) {
      throw createNoWalletSelectedError();
    }

    connecting.value = true;

    try {
      const connection = activeWallet.connect();

      triggerRef(wallet);
      await connection;
      assertWalletConnected(activeWallet);
      clearWalletError();
      triggerRef(wallet);
    } catch (error) {
      const normalizedError = normalizeSolanaError(error, "WALLET_FAILURE");

      triggerRef(wallet);
      throw normalizedError;
    } finally {
      connecting.value = false;
    }
  }

  async function disconnect() {
    const activeWallet = wallet.value;

    if (!activeWallet) {
      return;
    }

    disconnecting.value = true;

    try {
      await activeWallet.disconnect();
      clearWalletError();
      triggerRef(wallet);
    } catch (error) {
      const normalizedError = normalizeSolanaError(error, "WALLET_FAILURE");

      triggerRef(wallet);
      throw normalizedError;
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
