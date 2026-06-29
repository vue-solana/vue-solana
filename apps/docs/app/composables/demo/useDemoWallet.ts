import { computed, shallowRef } from "vue";
import type { SolanaWalletInfo } from "@vue-solana/core/types";
import { formatError } from "./errors";

export function useDemoWallet() {
  const wallet = useSolanaWallet();
  const walletDiscovery = useSolanaWallets();
  const toast = useToast();
  const walletsLoaded = shallowRef(false);

  const walletPublicKey = computed(() => wallet.publicKey.value?.toBase58() ?? "Not connected");
  const walletConfigured = computed(() => Boolean(wallet.wallet.value));
  const discoveredWalletCount = computed(() =>
    walletsLoaded.value ? walletDiscovery.wallets.value.length : 0,
  );
  const walletStatusText = computed(() => {
    if (wallet.connecting.value) {
      return "connecting";
    }

    if (wallet.disconnecting.value) {
      return "disconnecting";
    }

    return wallet.connected.value ? "connected" : "not connected";
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
        title: "Wallet connected",
        description: wallet.publicKey.value?.toBase58() ?? "Connected to selected wallet.",
        color: "success",
      });
    } catch (error) {
      toast.add({
        title: "Wallet connection failed",
        description: formatError(error) ?? "Unable to connect to the selected wallet.",
        color: "error",
      });
    }
  }

  async function disconnectWallet() {
    const publicKey = wallet.publicKey.value?.toBase58();

    try {
      await wallet.disconnect();

      toast.add({
        title: "Wallet disconnected",
        description: publicKey ?? "Disconnected from selected wallet.",
        color: "success",
      });
    } catch (error) {
      toast.add({
        title: "Wallet disconnection failed",
        description: formatError(error) ?? "Unable to disconnect from the selected wallet.",
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
        title: "Wallet address copied",
        description: publicKey,
        color: "success",
      });
    } catch (error) {
      toast.add({
        title: "Copy failed",
        description: formatError(error) ?? "Unable to copy wallet address.",
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
