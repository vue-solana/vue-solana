import type { SolanaError } from "@vue-solana/core/errors";
import type { SolanaContext, SolanaWallet, SolanaWalletInfo } from "@vue-solana/core/types";
import type { InjectionKey, Ref } from "vue";

export type SolanaConnectionStatus = "idle" | "checking" | "connected" | "error";

export interface VueSolanaContext extends SolanaContext {
  wallet: Ref<SolanaWallet | null>;
  status: Ref<SolanaConnectionStatus>;
  error: Ref<SolanaError | null>;
  latestBlockhash: Ref<string | null>;
  wallets: Ref<SolanaWalletInfo[]>;
  selectedWallet: Ref<SolanaWalletInfo | null>;
  checkConnection: () => Promise<void>;
  setWallet: (wallet: SolanaWallet | null) => void;
  refreshWallets: () => void;
  selectWallet: (wallet: SolanaWalletInfo | null) => void;
}

export const solanaInjectionKey: InjectionKey<VueSolanaContext> = Symbol("VueSolana");
