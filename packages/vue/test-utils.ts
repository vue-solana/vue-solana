import type { SolanaWallet } from "@vue-solana/core";
import { mount } from "@vue/test-utils";
import { h, provide, ref, shallowRef, type Component } from "vue";
import { solanaInjectionKey, type VueSolanaContext } from "./src/injection";

export function createMockSolanaContext(
  overrides: Partial<VueSolanaContext> = {},
): VueSolanaContext {
  const context: VueSolanaContext = {
    cluster: "devnet",
    endpoint: "https://api.devnet.solana.com",
    wsEndpoint: "wss://api.devnet.solana.com",
    connection: {
      getBalance: async () => 0,
    } as VueSolanaContext["connection"],
    wallet: shallowRef<SolanaWallet | null>(null),
    status: ref("idle"),
    error: ref(null),
    latestBlockhash: ref(null),
    checkConnection: async () => {},
    setWallet(wallet) {
      context.wallet.value = wallet;
    },
    ...overrides,
  };

  return context;
}

export function mountWithSolana(component: Component, context = createMockSolanaContext()) {
  return mount({
    setup() {
      provide(solanaInjectionKey, context);

      return () => h(component);
    },
  });
}
