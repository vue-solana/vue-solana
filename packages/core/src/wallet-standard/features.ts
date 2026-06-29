import type { SendTransactionOptions } from "../types";
import type { Wallet, WalletAccount } from "@wallet-standard/base";
import { StandardConnect, StandardDisconnect, StandardEvents } from "@wallet-standard/features";
import {
  SolanaSignAndSendTransaction,
  SolanaSignTransaction,
} from "@solana/wallet-standard-features";

export type StandardConnectFeature = {
  [StandardConnect]: {
    connect(input?: { silent?: boolean }): Promise<{ accounts: readonly WalletAccount[] }>;
  };
};

export type StandardDisconnectFeature = {
  [StandardDisconnect]: {
    disconnect(): Promise<void>;
  };
};

export type StandardEventsFeature = {
  [StandardEvents]: {
    on(
      event: "change",
      listener: (properties: { accounts?: readonly WalletAccount[] }) => void,
    ): () => void;
  };
};

export type SolanaSignTransactionFeature = {
  [SolanaSignTransaction]: {
    signTransaction(
      ...inputs: readonly {
        account: WalletAccount;
        transaction: Uint8Array;
        chain?: string;
        options?: unknown;
      }[]
    ): Promise<readonly { signedTransaction: Uint8Array }[]>;
  };
};

export type SolanaSignAndSendTransactionFeature = {
  [SolanaSignAndSendTransaction]: {
    signAndSendTransaction(
      ...inputs: readonly {
        account: WalletAccount;
        transaction: Uint8Array;
        chain: string;
        options?: SendTransactionOptions;
      }[]
    ): Promise<readonly { signature: Uint8Array }[]>;
  };
};

export function hasSignTransaction(
  wallet: Wallet,
): wallet is Wallet & { features: SolanaSignTransactionFeature } {
  return SolanaSignTransaction in wallet.features;
}

export function hasSignAndSendTransaction(
  wallet: Wallet,
): wallet is Wallet & { features: SolanaSignAndSendTransactionFeature } {
  return SolanaSignAndSendTransaction in wallet.features;
}
