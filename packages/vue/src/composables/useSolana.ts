import { inject, ref, shallowRef } from "vue";
import { solanaInjectionKey, type VueSolanaContext } from "../injection";

export function tryUseSolana() {
  return inject(solanaInjectionKey, null);
}

export function useSolana() {
  return tryUseSolana() ?? createSsrContext();
}

// A fresh inert context per call, never a module-scope singleton: a cached
// object would share `wallet` / `status` / `wallets` refs across concurrent
// SSR requests, leaking one user's wallet state into another's render.
function createSsrContext(): VueSolanaContext {
  return {
    cluster: "devnet",
    endpoint: "",
    wsEndpoint: "",
    client: createUnavailableProxy(),
    wallet: shallowRef(null),
    status: ref("idle"),
    error: ref(null),
    latestBlockhash: ref(null),
    wallets: shallowRef([]),
    selectedWallet: shallowRef(null),
    async checkConnection() {},
    setWallet() {},
    refreshWallets() {},
    selectWallet() {},
  };
}

function createUnavailableProxy<T>(): T {
  return new Proxy(
    {},
    {
      get() {
        throw new Error("Vue Solana plugin is not installed");
      },
    },
  ) as T;
}
