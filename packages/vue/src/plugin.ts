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
      const adaptedWallets = new WeakMap<object, SolanaWallet>();
      let unsubscribeWallets: (() => void) | null = null;
      let mobileWalletRegistrationPromise: Promise<void> | null = null;
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
        wallets.value = getRegisteredSolanaWallets();

        if (selectedWallet.value) {
          selectedWallet.value =
            wallets.value.find((nextWallet) => nextWallet.name === selectedWallet.value?.name) ??
            null;

          if (!selectedWallet.value) {
            wallet.value = options.wallet ?? null;
          }
        }

        if (options.mobileWallet !== false) {
          registerMobileWallets();
        }
      }

      function registerMobileWallets() {
        mobileWalletRegistrationPromise ??= import("@vue-solana/core/mobile-wallet")
          .then(({ registerSolanaMobileWallet }) => {
            registerSolanaMobileWallet({
              chains: [getSolanaChain(context.cluster)],
              ...(options.mobileWallet || {}),
            });
            wallets.value = getRegisteredSolanaWallets();
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
      }

      function getAdaptedWallet(walletInfo: SolanaWalletInfo) {
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
        },
      };

      app.provide(solanaInjectionKey, vueContext);

      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          void checkConnection();
        }, 0);
      }
    },
  };
}

function isObject(value: unknown): value is object {
  return (typeof value === "object" && value !== null) || typeof value === "function";
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
