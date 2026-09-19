import type { SendTransactionOptions } from "../types";
import type { Wallet, WalletAccount } from "@wallet-standard/base";
import { StandardConnect, StandardDisconnect, StandardEvents } from "@wallet-standard/features";
import {
  SolanaSignAndSendTransaction,
  SolanaSignIn,
  SolanaSignMessage,
  SolanaSignTransaction,
} from "@solana/wallet-standard-features";
import type { SolanaSignInInput, SolanaSignInOutput } from "@solana/wallet-standard-features";

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

export type SolanaSignMessageFeature = {
  [SolanaSignMessage]: {
    signMessage(
      ...inputs: readonly {
        account: WalletAccount;
        message: Uint8Array;
      }[]
    ): Promise<readonly { signedMessage: Uint8Array; signature: Uint8Array }[]>;
  };
};

export type SolanaSignInFeature = {
  [SolanaSignIn]: {
    signIn(...inputs: readonly SolanaSignInInput[]): Promise<readonly SolanaSignInOutput[]>;
  };
};

/**
 * Wallet Standard features are `{ version, ...methods }`. Requiring a string
 * `version` rejects malformed entries that merely occupy the feature key.
 */
function hasVersionedFeature(wallet: Wallet, feature: string): boolean {
  const value = (wallet.features as Record<string, unknown>)[feature];

  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { version?: unknown }).version === "string"
  );
}

export function hasSignTransaction(
  wallet: Wallet,
): wallet is Wallet & { features: SolanaSignTransactionFeature } {
  return hasVersionedFeature(wallet, SolanaSignTransaction);
}

export function hasSignIn(wallet: Wallet): wallet is Wallet & { features: SolanaSignInFeature } {
  return hasVersionedFeature(wallet, SolanaSignIn);
}

export function hasSignAndSendTransaction(
  wallet: Wallet,
): wallet is Wallet & { features: SolanaSignAndSendTransactionFeature } {
  return hasVersionedFeature(wallet, SolanaSignAndSendTransaction);
}

export function hasSignMessage(
  wallet: Wallet,
): wallet is Wallet & { features: SolanaSignMessageFeature } {
  return hasVersionedFeature(wallet, SolanaSignMessage);
}
