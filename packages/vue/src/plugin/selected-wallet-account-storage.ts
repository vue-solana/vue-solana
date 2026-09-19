const SELECTED_WALLET_ACCOUNT_STORAGE_KEY = "vue-solana:selected-wallet-account";

/**
 * Storage adapter used by `SelectedWalletAccountProvider`'s `stateSync`
 * option. The persisted value is the selected wallet's
 * `${walletName}:${accountAddress}` key.
 */
export interface SelectedWalletAccountStorage {
  storeSelectedWallet(key: string): void | Promise<void>;
  getSelectedWallet(): string | null | Promise<string | null>;
  deleteSelectedWallet(): void | Promise<void>;
}

/**
 * Default `stateSync` storage backed by `localStorage`. All operations are
 * safe no-ops when `localStorage` is unavailable (SSR, private browsing).
 */
export function createLocalStorageSelectedWalletAccountStorage(
  storage: Storage | null = defaultLocalStorage(),
): SelectedWalletAccountStorage {
  return {
    storeSelectedWallet(key) {
      try {
        storage?.setItem(SELECTED_WALLET_ACCOUNT_STORAGE_KEY, key);
      } catch {
        // Storage can be unavailable in constrained webviews; selection
        // simply does not persist.
      }
    },
    getSelectedWallet() {
      try {
        return storage?.getItem(SELECTED_WALLET_ACCOUNT_STORAGE_KEY) ?? null;
      } catch {
        return null;
      }
    },
    deleteSelectedWallet() {
      try {
        storage?.removeItem(SELECTED_WALLET_ACCOUNT_STORAGE_KEY);
      } catch {
        // Ignore.
      }
    },
  };
}

function defaultLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
