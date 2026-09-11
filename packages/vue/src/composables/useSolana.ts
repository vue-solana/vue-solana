import { inject, ref, shallowRef } from "vue";
import { solanaInjectionKey, type VueSolanaContext } from "../injection";

let ssrContext: VueSolanaContext | undefined;

export function tryUseSolana() {
  return inject(solanaInjectionKey, null);
}

export function useSolana() {
  return tryUseSolana() ?? getSsrContext();
}

function getSsrContext(): VueSolanaContext {
  ssrContext ??= {
    cluster: "devnet",
    endpoint: "",
    wsEndpoint: "",
    connection: createUnavailableProxy(),
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

  return ssrContext;
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
