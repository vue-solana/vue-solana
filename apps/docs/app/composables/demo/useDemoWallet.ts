import { computed, shallowRef } from "vue";
import type { SolanaWalletInfo } from "@vue-solana/core/types";
import { formatError } from "./errors";

export function useDemoWallet() {
  const { t } = useI18n();
  const wallet = useSolanaWallet();
  const walletDiscovery = useSolanaWallets();
  const toast = useToast();
  const walletsLoaded = shallowRef(false);

  const walletPublicKey = computed(
    () => wallet.publicKey.value?.toBase58() ?? t("demo.fallback.notConnected"),
  );
  const walletConfigured = computed(() => Boolean(wallet.wallet.value));
  const discoveredWalletCount = computed(() =>
    walletsLoaded.value ? walletDiscovery.wallets.value.length : 0,
  );
  const walletStatusText = computed(() => {
    if (wallet.connecting.value) {
      return t("demo.wallet.status.connecting");
    }

    if (wallet.disconnecting.value) {
      return t("demo.wallet.status.disconnecting");
    }

    return wallet.connected.value
      ? t("demo.wallet.status.connected")
      : t("demo.wallet.status.notConnected");
  });
  const walletStatusColor = computed(() => {
    if (wallet.loading.value) {
      return "warning" as const;
    }

    return wallet.connected.value ? ("success" as const) : ("neutral" as const);
  });
  const canConnectWallet = computed(
    () => walletConfigured.value && !wallet.connected.value && !wallet.loading.value,
  );
  const canDisconnectWallet = computed(
    () => walletConfigured.value && wallet.connected.value && !wallet.loading.value,
  );

  async function connectWallet() {
    try {
      await wallet.connect();

      toast.add({
        title: t("demo.wallet.toast.connected"),
        description: wallet.publicKey.value?.toBase58() ?? t("demo.wallet.toast.connectedFallback"),
        color: "success",
      });
    } catch (error) {
      toast.add({
        title: t("demo.wallet.toast.connectionFailed"),
        description: formatError(error) ?? t("demo.wallet.toast.connectionFailedFallback"),
        color: "error",
      });
    }
  }

  async function disconnectWallet() {
    const publicKey = wallet.publicKey.value?.toBase58();

    try {
      await wallet.disconnect();

      toast.add({
        title: t("demo.wallet.toast.disconnected"),
        description: publicKey ?? t("demo.wallet.toast.disconnectedFallback"),
        color: "success",
      });
    } catch (error) {
      toast.add({
        title: t("demo.wallet.toast.disconnectionFailed"),
        description: formatError(error) ?? t("demo.wallet.toast.disconnectionFailedFallback"),
        color: "error",
      });
    }
  }

  function deselectWallet() {
    walletDiscovery.selectWallet(null);
  }

  function selectDiscoveredWallet(discoveredWallet: SolanaWalletInfo) {
    walletDiscovery.selectWallet(discoveredWallet);
  }

  function loadWallets() {
    walletsLoaded.value = true;
    walletDiscovery.refreshWallets();
  }

  async function copyWalletAddress() {
    const publicKey = wallet.publicKey.value?.toBase58();

    if (!publicKey) {
      return;
    }

    try {
      await navigator.clipboard.writeText(publicKey);

      toast.add({
        title: t("demo.wallet.toast.copied"),
        description: publicKey,
        color: "success",
      });
    } catch (error) {
      toast.add({
        title: t("demo.wallet.toast.copyFailed"),
        description: formatError(error) ?? t("demo.wallet.toast.copyFailedFallback"),
        color: "error",
      });
    }
  }

  return {
    canConnectWallet,
    canDisconnectWallet,
    connectWallet,
    copyWalletAddress,
    deselectWallet,
    discoveredWalletCount,
    disconnectWallet,
    loadWallets,
    selectDiscoveredWallet,
    wallet,
    walletConfigured,
    walletDiscovery,
    walletPublicKey,
    walletsLoaded,
    walletStatusColor,
    walletStatusText,
  };
}
