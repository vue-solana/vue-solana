import {
  adaptSolanaIosWallet,
  getSolanaIosWallets,
  handleSolanaIosWalletCallback,
  isSolanaIosWalletInfo,
  type GetSolanaIosWalletsOptions,
} from "@vue-solana/core/ios-wallet";
import {
  adaptSolanaStandardWallet,
  getRegisteredSolanaWallets,
  getSolanaChain,
  subscribeSolanaWallets,
} from "@vue-solana/core/wallet-standard";
import type { RegisterSolanaMobileWalletOptions } from "@vue-solana/core/mobile-wallet";
import { createSolanaContext } from "@vue-solana/core/rpc";
import type { SolanaConfig, SolanaWallet, SolanaWalletInfo } from "@vue-solana/core/types";
import { ref, shallowRef, triggerRef, type App } from "vue";
import { solanaInjectionKey, type VueSolanaContext } from "./injection";

export interface VueSolanaPluginOptions extends SolanaConfig {
  wallet?: SolanaWallet | null;
  mobileWallet?: false | RegisterSolanaMobileWalletOptions;
  iosWallet?: false | GetSolanaIosWalletsOptions;
}

const RPC_CHECK_TIMEOUT_MS = 10_000;
const SELECTED_WALLET_STORAGE_KEY = "vue-solana:selected-wallet";

type PersistedSelectedWallet = Pick<SolanaWalletInfo, "name" | "platform" | "source">;

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
      const adaptedWallets = new WeakMap<object, SolanaWallet>();
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
        handleIosWalletCallback();
        wallets.value = getDiscoveredWallets();
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
            wallet.value = getAdaptedWallet(restoredWallet);
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
        wallet.value = nextWallet ? getAdaptedWallet(nextWallet) : (options.wallet ?? null);
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

      function getAdaptedWallet(walletInfo: SolanaWalletInfo) {
        if (isSolanaIosWalletInfo(walletInfo)) {
          return adaptSolanaIosWallet(walletInfo, {
            chain: getSolanaChain(context.cluster),
            cluster: context.cluster,
            onChange: () => triggerRef(wallet),
            ...(options.iosWallet || {}),
          });
        }

        if (!isObject(walletInfo.wallet)) {
          return adaptSolanaStandardWallet(walletInfo, {
            chain: getSolanaChain(context.cluster),
            onChange: () => triggerRef(wallet),
          });
        }

        const cachedWallet = adaptedWallets.get(walletInfo.wallet);

        if (cachedWallet) {
          return cachedWallet;
        }

        const adaptedWallet = adaptSolanaStandardWallet(walletInfo, {
          chain: getSolanaChain(context.cluster),
          onChange: () => triggerRef(wallet),
        });
        const cachedAdapter: SolanaWallet = {
          platform: walletInfo.platform,
          source: walletInfo.source,
          get publicKey() {
            return adaptedWallet.publicKey;
          },
          get connected() {
            return adaptedWallet.connected;
          },
          get connecting() {
            return adaptedWallet.connecting;
          },
          get disconnecting() {
            return adaptedWallet.disconnecting;
          },
          async connect() {
            await adaptedWallet.connect();

            await Promise.all(
              Array.from(getCachedWallets()).map((otherWallet) =>
                otherWallet !== cachedAdapter && otherWallet.connected
                  ? otherWallet.disconnect()
                  : undefined,
              ),
            );
          },
          disconnect: () => adaptedWallet.disconnect(),
          signTransaction: adaptedWallet.signTransaction?.bind(adaptedWallet),
          signAllTransactions: adaptedWallet.signAllTransactions?.bind(adaptedWallet),
          signAndSendTransaction: adaptedWallet.signAndSendTransaction?.bind(adaptedWallet),
        };

        adaptedWallets.set(walletInfo.wallet, cachedAdapter);
        return cachedAdapter;
      }

      function getDiscoveredWallets() {
        return [
          ...getRegisteredSolanaWallets(),
          ...(options.iosWallet === false
            ? []
            : getSolanaIosWallets({
                chains: [getSolanaChain(context.cluster)],
                cluster: context.cluster,
                ...(options.iosWallet || {}),
              })),
        ];
      }

      function handleIosWalletCallback() {
        try {
          handleSolanaIosWalletCallback({ clearUrl: true });
        } catch (cause) {
          console.error("[Vue Solana] iOS wallet callback failed", cause);
        }
      }

      function* getCachedWallets() {
        for (const walletInfo of wallets.value) {
          if (isObject(walletInfo.wallet)) {
            const cachedWallet = adaptedWallets.get(walletInfo.wallet);

            if (cachedWallet) {
              yield cachedWallet;
            }
          }
        }
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

function isObject(value: unknown): value is object {
  return (typeof value === "object" && value !== null) || typeof value === "function";
}

function isSameWallet(wallet: SolanaWalletInfo, selectedWallet: PersistedSelectedWallet | null) {
  return (
    wallet.name === selectedWallet?.name &&
    wallet.source === selectedWallet.source &&
    wallet.platform === selectedWallet.platform
  );
}

function readSelectedWallet(): PersistedSelectedWallet | null {
  const storage = getLocalStorage();

  if (!storage) {
    return null;
  }

  try {
    const value = storage.getItem(SELECTED_WALLET_STORAGE_KEY);

    if (!value) {
      return null;
    }

    const wallet = JSON.parse(value) as Partial<PersistedSelectedWallet>;

    return typeof wallet.name === "string"
      ? {
          name: wallet.name,
          platform: wallet.platform,
          source: wallet.source,
        }
      : null;
  } catch {
    return null;
  }
}

function writeSelectedWallet(wallet: SolanaWalletInfo | null) {
  const storage = getLocalStorage();

  if (!storage) {
    return;
  }

  try {
    if (wallet) {
      storage.setItem(SELECTED_WALLET_STORAGE_KEY, stringifySelectedWallet(wallet));
    } else {
      storage.removeItem(SELECTED_WALLET_STORAGE_KEY);
    }
  } catch {
    // Storage can be unavailable in private browsing or constrained webviews.
  }
}

function stringifySelectedWallet(wallet: PersistedSelectedWallet): string {
  const value: PersistedSelectedWallet = { name: wallet.name };

  if (wallet.platform) {
    value.platform = wallet.platform;
  }

  if (wallet.source) {
    value.source = wallet.source;
  }

  return JSON.stringify(value);
}

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const VueSolana = createSolanaPlugin;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}
