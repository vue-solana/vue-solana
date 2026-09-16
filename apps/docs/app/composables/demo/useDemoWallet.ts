import { computed, shallowRef } from "vue";
import type { SolanaWalletInfo } from "@vue-solana/core/types";
import { formatError } from "./errors";

export function useDemoWallet() {
  const { t } = useI18n();
  const wallet = useSolanaWallet();
  const walletDiscovery = useSolanaWallets();
  const toast = useToast();
  const walletsLoaded = shallowRef(false);

  const walletRawAddress = computed(
    () => wallet.wallet.value?.address ?? wallet.publicKey.value?.toBase58() ?? null,
  );
  const walletPublicKey = computed(() => walletRawAddress.value ?? t("demo.fallback.notConnected"));
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
        description: walletRawAddress.value ?? t("demo.wallet.toast.connectedFallback"),
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
    const address = walletRawAddress.value;

    try {
      await wallet.disconnect();

      toast.add({
        title: t("demo.wallet.toast.disconnected"),
        description: address ?? t("demo.wallet.toast.disconnectedFallback"),
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
    const address = walletRawAddress.value;

    if (!address) {
      return;
    }

    try {
      await navigator.clipboard.writeText(address);

      toast.add({
        title: t("demo.wallet.toast.copied"),
        description: address,
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
