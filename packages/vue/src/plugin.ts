import { createSolanaContext, type SolanaConfig, type SolanaWallet } from "@vue-solana/core";
import { ref, shallowRef, type App } from "vue";
import { solanaInjectionKey, type VueSolanaContext } from "./injection";

export interface VueSolanaPluginOptions extends SolanaConfig {
  wallet?: SolanaWallet | null;
}

export function createSolanaPlugin(options: VueSolanaPluginOptions = {}) {
  return {
    install(app: App) {
      const context = createSolanaContext(options);
      const wallet = shallowRef<SolanaWallet | null>(options.wallet ?? null);
      const status = ref<VueSolanaContext["status"]["value"]>("idle");
      const error = ref<string | null>(null);
      const latestBlockhash = ref<string | null>(null);

      async function checkConnection() {
        status.value = "checking";
        error.value = null;

        console.info("[Vue Solana] Checking RPC connection", {
          cluster: context.cluster,
          endpoint: context.endpoint,
          wsEndpoint: context.wsEndpoint,
        });

        try {
          const blockhash = await context.connection.getLatestBlockhash();

          latestBlockhash.value = blockhash.blockhash;
          status.value = "connected";

          console.info("[Vue Solana] Connected", {
            cluster: context.cluster,
            endpoint: context.endpoint,
            wsEndpoint: context.wsEndpoint,
            blockhash,
          });
        } catch (cause) {
          status.value = "error";
          error.value = cause instanceof Error ? cause.message : String(cause);

          console.error("[Vue Solana] Connection failed", cause);
        }
      }

      const vueContext: VueSolanaContext = {
        ...context,
        wallet,
        status,
        error,
        latestBlockhash,
        checkConnection,
        setWallet(nextWallet) {
          wallet.value = nextWallet;
        },
      };

      app.provide(solanaInjectionKey, vueContext);

      void checkConnection();
    },
  };
}

export const VueSolana = createSolanaPlugin;
