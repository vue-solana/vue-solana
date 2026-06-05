import type { SolanaContext, SolanaWallet } from "@vue-solana/core";
import type { InjectionKey, Ref } from "vue";

export type SolanaConnectionStatus = "idle" | "checking" | "connected" | "error";

export interface VueSolanaContext extends SolanaContext {
  wallet: Ref<SolanaWallet | null>;
  status: Ref<SolanaConnectionStatus>;
  error: Ref<string | null>;
  latestBlockhash: Ref<string | null>;
  checkConnection: () => Promise<void>;
  setWallet: (wallet: SolanaWallet | null) => void;
}

export const solanaInjectionKey: InjectionKey<VueSolanaContext> = Symbol("VueSolana");
