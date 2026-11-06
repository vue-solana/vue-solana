import { createSolanaError, type SolanaError } from "@vue-solana/core/errors";
import type { SolanaWalletInfo } from "@vue-solana/core/types";

const SELECTED_WALLET_STORAGE_KEY = "vue-solana:selected-wallet";

export type PersistedSelectedWallet = Pick<SolanaWalletInfo, "name" | "platform" | "source">;

export interface ReadSelectedWalletResult {
  wallet: PersistedSelectedWallet | null;
  /**
   * Whether the wallet was connected when the page was left. A refresh uses it
   * to restore the session silently even without `autoConnect`.
   */
  connected: boolean;
  error: SolanaError | null;
}

export function readSelectedWallet(): ReadSelectedWalletResult {
  const { storage, error } = getLocalStorage();

  if (error || !storage) {
    return { wallet: null, connected: false, error };
  }

  try {
    const value = storage.getItem(SELECTED_WALLET_STORAGE_KEY);

    if (!value) {
      return { wallet: null, connected: false, error: null };
    }

    const wallet = JSON.parse(value) as Partial<PersistedSelectedWallet> & {
      connected?: unknown;
    };
    const hasName = typeof wallet.name === "string";

    return {
      wallet: hasName
        ? {
            name: wallet.name!,
            platform: wallet.platform,
            source: wallet.source,
          }
        : null,
      connected: hasName && wallet.connected === true,
      error: null,
    };
  } catch (cause) {
    return {
      wallet: null,
      connected: false,
      error: createSolanaError("STORAGE_FAILURE", "Unable to read the selected Solana wallet", {
        cause,
      }),
    };
  }
}

export function writeSelectedWallet(
  wallet: SolanaWalletInfo | null,
  connected = false,
): SolanaError | null {
  const { storage, error } = getLocalStorage();

  if (error || !storage) {
    return error;
  }

  try {
    if (wallet) {
      storage.setItem(
        SELECTED_WALLET_STORAGE_KEY,
        JSON.stringify(
          connected
            ? { ...toPersistedSelectedWallet(wallet), connected: true }
            : toPersistedSelectedWallet(wallet),
        ),
      );
    } else {
      storage.removeItem(SELECTED_WALLET_STORAGE_KEY);
    }
    return null;
  } catch (cause) {
    // Storage can be unavailable in private browsing or constrained webviews.
    return createSolanaError("STORAGE_FAILURE", "Unable to persist the selected Solana wallet", {
      cause,
    });
  }
}

/** The wallet's identity only: also the key that de-duplicates auto-connect attempts. */
export function stringifySelectedWallet(wallet: PersistedSelectedWallet): string {
  return JSON.stringify(toPersistedSelectedWallet(wallet));
}

function toPersistedSelectedWallet(wallet: PersistedSelectedWallet): PersistedSelectedWallet {
  const value: PersistedSelectedWallet = { name: wallet.name };

  if (wallet.platform) {
    value.platform = wallet.platform;
  }

  if (wallet.source) {
    value.source = wallet.source;
  }

  return value;
}

interface LocalStorageResult {
  storage: Storage | null;
  error: SolanaError | null;
}

function getLocalStorage(): LocalStorageResult {
  if (typeof window === "undefined") {
    return { storage: null, error: null };
  }

  try {
    return { storage: window.localStorage, error: null };
  } catch (cause) {
    return {
      storage: null,
      error: createSolanaError("STORAGE_FAILURE", "Unable to read the selected Solana wallet", {
        cause,
      }),
    };
  }
}
