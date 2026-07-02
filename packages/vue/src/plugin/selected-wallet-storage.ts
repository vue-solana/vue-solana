import { createSolanaError, type SolanaError } from "@vue-solana/core/errors";
import type { SolanaWalletInfo } from "@vue-solana/core/types";

const SELECTED_WALLET_STORAGE_KEY = "vue-solana:selected-wallet";

export type PersistedSelectedWallet = Pick<SolanaWalletInfo, "name" | "platform" | "source">;

export interface ReadSelectedWalletResult {
  wallet: PersistedSelectedWallet | null;
  error: SolanaError | null;
}

export function readSelectedWallet(): ReadSelectedWalletResult {
  const { storage, error } = getLocalStorage();

  if (error || !storage) {
    return { wallet: null, error };
  }

  try {
    const value = storage.getItem(SELECTED_WALLET_STORAGE_KEY);

    if (!value) {
      return { wallet: null, error: null };
    }

    const wallet = JSON.parse(value) as Partial<PersistedSelectedWallet>;

    return {
      wallet:
        typeof wallet.name === "string"
          ? {
              name: wallet.name,
              platform: wallet.platform,
              source: wallet.source,
            }
          : null,
      error: null,
    };
  } catch (cause) {
    return {
      wallet: null,
      error: createSolanaError("STORAGE_FAILURE", "Unable to read the selected Solana wallet", {
        cause,
      }),
    };
  }
}

export function writeSelectedWallet(wallet: SolanaWalletInfo | null): SolanaError | null {
  const { storage, error } = getLocalStorage();

  if (error || !storage) {
    return error;
  }

  try {
    if (wallet) {
      storage.setItem(SELECTED_WALLET_STORAGE_KEY, stringifySelectedWallet(wallet));
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

export function stringifySelectedWallet(wallet: PersistedSelectedWallet): string {
  const value: PersistedSelectedWallet = { name: wallet.name };

  if (wallet.platform) {
    value.platform = wallet.platform;
  }

  if (wallet.source) {
    value.source = wallet.source;
  }

  return JSON.stringify(value);
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
