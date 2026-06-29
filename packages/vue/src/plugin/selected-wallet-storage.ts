import type { SolanaWalletInfo } from "@vue-solana/core/types";

const SELECTED_WALLET_STORAGE_KEY = "vue-solana:selected-wallet";

export type PersistedSelectedWallet = Pick<SolanaWalletInfo, "name" | "platform" | "source">;

export function readSelectedWallet(): PersistedSelectedWallet | null {
  const storage = getLocalStorage();

  if (!storage) {
    return null;
  }

  try {
    const value = storage.getItem(SELECTED_WALLET_STORAGE_KEY);

    if (!value) {
      return null;
    }

    const wallet = JSON.parse(value) as Partial<PersistedSelectedWallet>;

    return typeof wallet.name === "string"
      ? {
          name: wallet.name,
          platform: wallet.platform,
          source: wallet.source,
        }
      : null;
  } catch {
    return null;
  }
}

export function writeSelectedWallet(wallet: SolanaWalletInfo | null) {
  const storage = getLocalStorage();

  if (!storage) {
    return;
  }

  try {
    if (wallet) {
      storage.setItem(SELECTED_WALLET_STORAGE_KEY, stringifySelectedWallet(wallet));
    } else {
      storage.removeItem(SELECTED_WALLET_STORAGE_KEY);
    }
  } catch {
    // Storage can be unavailable in private browsing or constrained webviews.
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

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
