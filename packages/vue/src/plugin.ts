import type { GetSolanaIosWalletsOptions } from "@vue-solana/core/ios-wallet";
import type { RegisterSolanaMobileWalletOptions } from "@vue-solana/core/mobile-wallet";
import { createSolanaContext } from "@vue-solana/core/rpc";
import type { SolanaConfig, SolanaWallet, SolanaWalletInfo } from "@vue-solana/core/types";
import { getSolanaChain, subscribeSolanaWallets } from "@vue-solana/core/wallet-standard";
import { ref, shallowRef, triggerRef, type App } from "vue";
import { solanaInjectionKey, type VueSolanaContext } from "./injection";
import {
  readSelectedWallet,
  stringifySelectedWallet,
  writeSelectedWallet,
  type PersistedSelectedWallet,
} from "./plugin/selected-wallet-storage";
import { withTimeout } from "./plugin/timeout";
import { createSolanaWalletRegistry } from "./plugin/wallet-registry";

export interface VueSolanaPluginOptions extends SolanaConfig {
  wallet?: SolanaWallet | null;
  mobileWallet?: false | RegisterSolanaMobileWalletOptions;
  iosWallet?: false | GetSolanaIosWalletsOptions;
}

const RPC_CHECK_TIMEOUT_MS = 10_000;

export function createSolanaPlugin(options: VueSolanaPluginOptions = {}) {
  return {
    install(app: App) {
      const context = createSolanaContext(options);
      const wallet = shallowRef<SolanaWallet | null>(options.wallet ?? null);
      const wallets = shallowRef<SolanaWalletInfo[]>([]);
      const selectedWallet = shallowRef<SolanaWalletInfo | null>(null);
      const status = ref<VueSolanaContext["status"]["value"]>("idle");
      const error = ref<string | null>(null);
      const latestBlockhash = ref<string | null>(null);
      const walletRegistry = createSolanaWalletRegistry({
        cluster: context.cluster,
        iosWallet: options.iosWallet,
        getWalletInfos: () => wallets.value,
        onWalletChange: () => triggerRef(wallet),
      });
      let unsubscribeWallets: (() => void) | null = null;
      let mobileWalletRegistrationPromise: Promise<void> | null = null;
      let attemptedAutoConnectWallet: string | null = null;
      let rpcCheckId = 0;

      async function checkConnection() {
        const checkId = ++rpcCheckId;

        status.value = "checking";
        error.value = null;

        console.info("[Vue Solana] Checking RPC connection", {
          cluster: context.cluster,
          endpoint: context.endpoint,
          wsEndpoint: context.wsEndpoint,
        });

        try {
          const blockhash = await withTimeout(
            context.connection.getLatestBlockhash() as Promise<{ blockhash: string }>,
            RPC_CHECK_TIMEOUT_MS,
            `RPC connection check timed out after ${RPC_CHECK_TIMEOUT_MS / 1_000} seconds.`,
          );

          if (checkId !== rpcCheckId) {
            return;
          }

          latestBlockhash.value = blockhash.blockhash;
          status.value = "connected";

          console.info("[Vue Solana] Connected", {
            cluster: context.cluster,
            endpoint: context.endpoint,
            wsEndpoint: context.wsEndpoint,
            blockhash,
          });
        } catch (cause) {
          if (checkId !== rpcCheckId) {
            return;
          }

          status.value = "error";
          error.value = cause instanceof Error ? cause.message : String(cause);

          console.error("[Vue Solana] Connection failed", cause);
        }
      }

      function refreshWallets() {
        unsubscribeWallets ??= subscribeSolanaWallets(refreshWallets);
        walletRegistry.handleIosWalletCallback();
        wallets.value = walletRegistry.getDiscoveredWallets();
        let restoredWallet: SolanaWalletInfo | null = null;

        if (selectedWallet.value) {
          selectedWallet.value =
            wallets.value.find((nextWallet) => isSameWallet(nextWallet, selectedWallet.value)) ??
            null;

          if (!selectedWallet.value) {
            wallet.value = options.wallet ?? null;
          }
        } else {
          const persistedWallet = readSelectedWallet();
          restoredWallet = persistedWallet
            ? (wallets.value.find((nextWallet) => isSameWallet(nextWallet, persistedWallet)) ??
              null)
            : null;

          if (restoredWallet) {
            selectedWallet.value = restoredWallet;
            wallet.value = walletRegistry.getAdaptedWallet(restoredWallet);
          }
        }

        if (options.mobileWallet !== false) {
          registerMobileWallets();
        }

        if (restoredWallet) {
          autoConnectWallet(restoredWallet);
        }
      }

      function registerMobileWallets() {
        mobileWalletRegistrationPromise ??= import("@vue-solana/core/mobile-wallet")
          .then(({ registerSolanaMobileWallet }) => {
            registerSolanaMobileWallet({
              chains: [getSolanaChain(context.cluster)],
              ...(options.mobileWallet || {}),
            });
            refreshWallets();
          })
          .catch((cause) => {
            console.error("[Vue Solana] Mobile wallet registration failed", cause);
          })
          .finally(() => {
            mobileWalletRegistrationPromise = null;
          });
      }

      function selectWallet(nextWallet: SolanaWalletInfo | null) {
        selectedWallet.value = nextWallet;
        wallet.value = nextWallet
          ? walletRegistry.getAdaptedWallet(nextWallet)
          : (options.wallet ?? null);
        writeSelectedWallet(nextWallet);
      }

      function autoConnectWallet(walletInfo: SolanaWalletInfo) {
        if (!options.autoConnect) {
          return;
        }

        const activeWallet = wallet.value;
        const storageValue = stringifySelectedWallet(walletInfo);

        if (
          !activeWallet ||
          activeWallet.connected ||
          activeWallet.connecting ||
          attemptedAutoConnectWallet === storageValue
        ) {
          return;
        }

        attemptedAutoConnectWallet = storageValue;
        void activeWallet
          .connect()
          .catch((cause) => {
            console.error("[Vue Solana] Wallet auto-connect failed", cause);
          })
          .finally(() => {
            triggerRef(wallet);
          });
      }

      const vueContext: VueSolanaContext = {
        ...context,
        wallet,
        status,
        error,
        latestBlockhash,
        wallets,
        selectedWallet,
        checkConnection,
        refreshWallets,
        selectWallet,
        setWallet(nextWallet) {
          selectedWallet.value = null;
          wallet.value = nextWallet;
          writeSelectedWallet(null);
        },
      };

      app.provide(solanaInjectionKey, vueContext);

      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          try {
            refreshWallets();
          } catch (cause) {
            console.error("[Vue Solana] Wallet refresh failed", cause);
          }

          void checkConnection();
        }, 0);
      }
    },
  };
}

function isSameWallet(wallet: SolanaWalletInfo, selectedWallet: PersistedSelectedWallet | null) {
  return (
    wallet.name === selectedWallet?.name &&
    wallet.source === selectedWallet.source &&
    wallet.platform === selectedWallet.platform
  );
}

export const VueSolana = createSolanaPlugin;
