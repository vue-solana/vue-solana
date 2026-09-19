import type { SolanaWalletInfo } from "@vue-solana/core/types";
import {
  computed,
  getCurrentScope,
  inject,
  onScopeDispose,
  provide,
  ref,
  watch,
  type ComputedRef,
  type InjectionKey,
  type Ref,
} from "vue";
import { solanaInjectionKey } from "../injection";
import {
  createLocalStorageSelectedWalletAccountStorage,
  type SelectedWalletAccountStorage,
} from "../plugin/selected-wallet-account-storage";

export type SelectedWalletAccount = SolanaWalletInfo["accounts"][number] & {
  /** The wallet that owns this account. */
  walletName: string;
};

export type WalletAccountFilter = (
  walletName: string,
  account: SolanaWalletInfo["accounts"][number],
) => boolean;

export interface SelectedWalletAccountContext {
  selectedWalletAccount: Ref<SelectedWalletAccount | null>;
  setSelectedWalletAccount: (account: SelectedWalletAccount | null) => void;
  filteredWallets: ComputedRef<SolanaWalletInfo[]>;
}

export const selectedWalletAccountInjectionKey: InjectionKey<SelectedWalletAccountContext> =
  Symbol.for("vue-solana:selected-wallet-account");

export interface SelectedWalletAccountOptions {
  /**
   * Restricts the wallets exposed through `filteredWallets` and the accounts
   * that can be selected. Receives the wallet name and each of its accounts;
   * return `false` to hide the account (a wallet with no remaining accounts
   * is hidden entirely).
   */
  filterWallet?: WalletAccountFilter;
  /**
   * Persists the selection as `${walletName}:${accountAddress}`. Defaults to
   * `localStorage`; pass `null` to disable persistence.
   */
  stateSync?: SelectedWalletAccountStorage | null;
}

/**
 * App-wide selected wallet account state, mirroring `@solana/react`'s
 * `SelectedWalletAccountContextProvider`.
 *
 * Call once near the root of your app, then read state anywhere with
 * {@link useSelectedWalletAccount}. The selection persists as
 * `${walletName}:${accountAddress}` through `stateSync` and is restored on
 * the next mount when the wallet and account are available again.
 */
export function provideSelectedWalletAccount(
  options: SelectedWalletAccountOptions = {},
): SelectedWalletAccountContext {
  const context = createSelectedWalletAccountContext(options);

  provide(selectedWalletAccountInjectionKey, context);

  return context;
}

/**
 * Build the selected wallet account context without providing it. Used by
 * the Nuxt runtime plugin, which installs the context app-wide via
 * `app.provide` rather than inside a component setup.
 *
 * When called outside a component setup (as the Nuxt plugin does), `inject`
 * cannot resolve the Solana context, so pass it explicitly through
 * {@link solanaContextOverride}.
 */
export function createSelectedWalletAccountContext(
  options: SelectedWalletAccountOptions = {},
  solanaContextOverride?: SolanaContextLike | null,
): SelectedWalletAccountContext {
  const solanaContext = solanaContextOverride ?? inject(solanaInjectionKey, null);
  const stateSync = options.stateSync === undefined ? defaultStateSync() : options.stateSync;
  const selectedWalletAccount = ref<SelectedWalletAccount | null>(null);
  const walletsValue = () => solanaContext?.wallets.value ?? [];
  let pendingKey: string | null = null;
  // Bumped on every explicit selection change so an async persisted-state read
  // that started earlier cannot resurrect a selection the user just changed.
  let selectionGeneration = 0;

  function findAccount(key: string): SelectedWalletAccount | null {
    // Addresses are base58 (never contain ":"), but wallet names may, so split
    // on the last separator.
    const separatorIndex = key.lastIndexOf(":");
    const walletName = separatorIndex === -1 ? key : key.slice(0, separatorIndex);
    const address = separatorIndex === -1 ? "" : key.slice(separatorIndex + 1);
    const wallet = walletsValue().find((candidate) => candidate.name === walletName);
    const account = wallet?.accounts.find((candidate) => candidate.address === address);

    if (!wallet || !account) {
      return null;
    }

    return { ...account, walletName: wallet.name };
  }

  function clearSelection() {
    selectionGeneration += 1;
    pendingKey = null;
    selectedWalletAccount.value = null;
  }

  function applyExternalSelection(key: string | null) {
    if (!key) {
      clearSelection();

      return;
    }

    const account = findAccount(key);

    if (account) {
      selectionGeneration += 1;
      pendingKey = null;
      selectedWalletAccount.value = account;

      return;
    }

    // Wallets are discovered asynchronously, so a key that cannot be resolved
    // yet is kept pending and retried on every wallet change.
    pendingKey = key;
  }

  function restoreIfAvailable() {
    if (!pendingKey || selectedWalletAccount.value) {
      return;
    }

    const account = findAccount(pendingKey);

    if (account) {
      selectedWalletAccount.value = account;
      pendingKey = null;
    }
  }

  if (stateSync) {
    const generation = selectionGeneration;

    void Promise.resolve(stateSync.getSelectedWallet())
      .then((key) => {
        if (generation !== selectionGeneration || !key || selectedWalletAccount.value) {
          return;
        }

        pendingKey = key;

        // Wallets are discovered asynchronously (they populate shortly after
        // app boot), so the persisted account may not be resolvable yet. Retry
        // on every wallet change until it appears or the user selects anew.
        restoreIfAvailable();
      })
      .catch(() => undefined);
  }

  if (solanaContext) {
    watch(
      () => solanaContext.wallets.value,
      () => restoreIfAvailable(),
    );
  }

  // Cross-tab sync: another tab writing the persisted selection fires a
  // `storage` event here. Re-read and apply it (the event never fires in the
  // tab that made the change, so there is no feedback loop).
  if (stateSync && typeof window !== "undefined") {
    const onStorage = () => {
      void Promise.resolve(stateSync.getSelectedWallet())
        .then((key) => applyExternalSelection(key))
        .catch(() => undefined);
    };

    window.addEventListener("storage", onStorage);

    if (getCurrentScope()) {
      onScopeDispose(() => window.removeEventListener("storage", onStorage));
    }
  }

  const context: SelectedWalletAccountContext = {
    selectedWalletAccount,
    setSelectedWalletAccount(account) {
      selectionGeneration += 1;
      selectedWalletAccount.value = account;
      pendingKey = null;

      if (!stateSync) {
        return;
      }

      // A custom `stateSync` may reject; never leak an unhandled rejection.
      const persisted = account
        ? stateSync.storeSelectedWallet(`${account.walletName}:${account.address}`)
        : stateSync.deleteSelectedWallet();

      void Promise.resolve(persisted).catch(() => undefined);
    },
    filteredWallets: computed(() => {
      const filter = options.filterWallet;

      if (!filter) {
        return walletsValue();
      }

      return walletsValue()
        .map((wallet) => {
          const accounts = wallet.accounts.filter((account) => filter(wallet.name, account));

          return accounts.length === 0 ? null : ({ ...wallet, accounts } as SolanaWalletInfo);
        })
        .filter((wallet): wallet is SolanaWalletInfo => wallet !== null);
    }),
  };

  return context;
}

/**
 * Read the app-wide selected wallet account provided by
 * {@link provideSelectedWalletAccount}.
 *
 * Returns `[selectedAccount, setSelectedAccount, filteredWallets]`. The
 * setter accepts `null` to clear the selection. Throws when called outside a
 * provider — mount `SelectedWalletAccountProvider` (or call
 * `provideSelectedWalletAccount`) first.
 */
export function useSelectedWalletAccount(): [
  Ref<SelectedWalletAccount | null>,
  (account: SelectedWalletAccount | null) => void,
  ComputedRef<SolanaWalletInfo[]>,
] {
  const context = inject(selectedWalletAccountInjectionKey, null);

  if (!context) {
    throw new Error("useSelectedWalletAccount must be used inside a SelectedWalletAccountProvider");
  }

  return [context.selectedWalletAccount, context.setSelectedWalletAccount, context.filteredWallets];
}

function defaultStateSync(): SelectedWalletAccountStorage | null {
  return createLocalStorageSelectedWalletAccountStorage();
}

/**
 * The minimal Solana context surface this composable reads. Structural so the
 * full `VueSolanaContext` (or the raw RPC context) satisfies it without an
 * import cycle from the plugin to its composables.
 */
interface SolanaContextLike {
  wallets: Ref<SolanaWalletInfo[]>;
}
