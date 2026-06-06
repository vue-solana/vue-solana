import {
  adaptSolanaStandardWallet,
  createSolanaContext,
  getRegisteredSolanaWallets,
  getSolanaChain,
  subscribeSolanaWallets,
  type SolanaConfig,
  type SolanaWallet,
  type SolanaWalletInfo,
} from "@vue-solana/core";
import { ref, shallowRef, triggerRef, type App } from "vue";
import { solanaInjectionKey, type VueSolanaContext } from "./injection";

export interface VueSolanaPluginOptions extends SolanaConfig {
  wallet?: SolanaWallet | null;
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
      let unsubscribeWallets: (() => void) | null = null;
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
      }

      function selectWallet(nextWallet: SolanaWalletInfo | null) {
        selectedWallet.value = nextWallet;
        wallet.value = nextWallet
          ? adaptSolanaStandardWallet(nextWallet, {
              chain: getSolanaChain(context.cluster),
              onChange: () => triggerRef(wallet),
            })
          : (options.wallet ?? null);
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

      void checkConnection();
    },
  };
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
