import {
  adaptSolanaIosWallet,
  getSolanaIosWallets,
  handleSolanaIosWalletCallback,
  isSolanaIosWalletInfo,
  type GetSolanaIosWalletsOptions,
} from "@vue-solana/core/ios-wallet";
import {
  adaptSolanaStandardWallet,
  disconnectSolanaStandardWallet,
  getRegisteredSolanaWallets,
  getSolanaChain,
} from "@vue-solana/core/wallet-standard";
import { withTimeout } from "@vue-solana/core/timeout";
import type { SolanaCluster, SolanaWallet, SolanaWalletInfo } from "@vue-solana/core/types";

/**
 * A disconnect that never settles (the extension was disabled or uninstalled
 * while its injected script is still in the page) must not hold up the connect
 * that already succeeded.
 */
const DISCONNECT_TIMEOUT_MS = 2_000;

interface SolanaWalletRegistryOptions {
  cluster: SolanaCluster;
  iosWallet?: false | GetSolanaIosWalletsOptions;
  getWalletInfos: () => readonly SolanaWalletInfo[];
  onWalletChange: () => void;
  onError?: (cause: unknown) => void;
}

export function createSolanaWalletRegistry(options: SolanaWalletRegistryOptions) {
  const adaptedWallets = new WeakMap<object, SolanaWallet>();
  // Adapters for non-object `wallet` values have no stable object to key a
  // `WeakMap` by, so they are cached here by wallet identity instead. The
  // wallet list is tiny (a handful of entries), so a strong `Map` is fine.
  const adaptedPrimitiveWallets = new Map<string, SolanaWallet>();
  // Every adapter this registry has created. The caches above only cover
  // adapters still reachable by key; a standard wallet unregistered from
  // discovery before teardown would no longer be found through
  // `options.getWalletInfos()`. Teardown iterates this set, so every
  // adapter's Wallet Standard `change` subscription is released.
  const trackedAdapters = new Set<SolanaWallet>();

  function trackAdapter(adapter: SolanaWallet): SolanaWallet {
    trackedAdapters.add(adapter);
    return adapter;
  }

  function getAdaptedWallet(walletInfo: SolanaWalletInfo) {
    if (isSolanaIosWalletInfo(walletInfo)) {
      // iOS definitions are stable module-level objects, so unlike before
      // they are cached like standard wallets: rebuilding per call would
      // accumulate tracked adapters (and any future event subscription)
      // with no way to release the older ones before teardown.
      const cachedIosWallet = adaptedWallets.get(walletInfo.wallet);

      if (cachedIosWallet) {
        return cachedIosWallet;
      }

      const iosAdapter = makeConnectExclusive(
        adaptSolanaIosWallet(walletInfo, {
          chain: getSolanaChain(options.cluster),
          cluster: options.cluster,
          onChange: options.onWalletChange,
          ...(options.iosWallet || {}),
        }),
        walletInfo,
      );
      adaptedWallets.set(walletInfo.wallet, iosAdapter);
      return trackAdapter(iosAdapter);
    }

    if (!isObject(walletInfo.wallet)) {
      const primitiveKey = getPrimitiveWalletKey(walletInfo);
      const cachedPrimitiveWallet = adaptedPrimitiveWallets.get(primitiveKey);

      if (cachedPrimitiveWallet) {
        return cachedPrimitiveWallet;
      }

      const primitiveAdapter = makeConnectExclusive(
        adaptSolanaStandardWallet(walletInfo, {
          chain: getSolanaChain(options.cluster),
          onChange: options.onWalletChange,
        }),
        walletInfo,
      );
      adaptedPrimitiveWallets.set(primitiveKey, primitiveAdapter);
      return trackAdapter(primitiveAdapter);
    }

    const cachedWallet = adaptedWallets.get(walletInfo.wallet);

    if (cachedWallet) {
      return cachedWallet;
    }

    // `connect` also closes the app's authorization with every other discovered
    // wallet; everything else on the adapter is untouched.
    const cachedAdapter = makeConnectExclusive(
      adaptSolanaStandardWallet(walletInfo, {
        chain: getSolanaChain(options.cluster),
        onChange: options.onWalletChange,
      }),
      walletInfo,
    );

    adaptedWallets.set(walletInfo.wallet, cachedAdapter);
    return trackAdapter(cachedAdapter);
  }

  /**
   * The adapter this registry already built for a discovered wallet, if any.
   * Both caches are consulted so a primitive-keyed adapter (no stable object to
   * key a `WeakMap` by) is found just like a standard or iOS one.
   */
  function getCachedAdapter(walletInfo: SolanaWalletInfo) {
    return isObject(walletInfo.wallet)
      ? adaptedWallets.get(walletInfo.wallet)
      : adaptedPrimitiveWallets.get(getPrimitiveWalletKey(walletInfo));
  }

  function getDiscoveredWallets() {
    return [
      ...getRegisteredSolanaWallets(),
      ...(options.iosWallet === false
        ? []
        : getSolanaIosWallets({
            chains: [getSolanaChain(options.cluster)],
            cluster: options.cluster,
            ...(options.iosWallet || {}),
          })),
    ];
  }

  function handleIosWalletCallback() {
    try {
      handleSolanaIosWalletCallback({ clearUrl: true });
    } catch (cause) {
      options.onError?.(cause);
    }
  }

  /**
   * Makes `connect()` also close the app's authorization with every other
   * discovered wallet.
   *
   * The sweep runs over *discovery*, not over adapters: a wallet the user
   * authorized in an earlier page session has no adapter here (our `connected`
   * flag is this app's state, not the extension's), so an adapter-only sweep
   * leaves it authorized — and a second authorized extension is what makes the
   * wrong wallet answer a signing request.
   *
   * `connect` is replaced in place rather than through a `Proxy` so the adapter
   * keeps its identity (the registry caches it) and the `publicKey`/`connected`
   * getters stay on the hot path with no interception.
   */
  function makeConnectExclusive<T extends SolanaWallet>(
    adapter: T,
    walletInfo: SolanaWalletInfo,
  ): T {
    const connect = adapter.connect.bind(adapter);

    adapter.connect = async () => {
      await connect();
      await disconnectOtherWallets(walletInfo, adapter);
    };

    return adapter;
  }

  async function disconnectOtherWallets(
    currentWallet: SolanaWalletInfo,
    currentAdapter: SolanaWallet,
  ) {
    await Promise.all(
      options.getWalletInfos().map(async (walletInfo) => {
        const cachedWallet = getCachedAdapter(walletInfo);

        if (cachedWallet === currentAdapter || isSameWalletInfo(walletInfo, currentWallet)) {
          return;
        }

        try {
          // A cached adapter is disconnected through itself so its cached
          // account is cleared too; an uncached wallet has no state here yet.
          await withTimeout(
            disconnectWallet(walletInfo, cachedWallet),
            DISCONNECT_TIMEOUT_MS,
            () =>
              new Error(`Solana wallet "${walletInfo.name}" did not disconnect within its timeout`),
          );
        } catch {
          // A wallet that refuses to disconnect, prompts and is dismissed, has
          // no disconnect feature, or never answers must not fail the connect
          // that already succeeded. A wallet that answers *after* its timeout
          // can still restore its own cached account (the adapter treats a
          // failed disconnect as "still connected"); the wallet's `change`
          // subscription re-reads the list, so the UI stays truthful.
        }
      }),
    );
  }

  async function disconnectWallet(walletInfo: SolanaWalletInfo, cachedWallet?: SolanaWallet) {
    if (cachedWallet) {
      await cachedWallet.disconnect();
      return;
    }

    await disconnectSolanaStandardWallet(walletInfo);
  }

  /**
   * Releases every adapter's Wallet Standard `change` subscription. Called
   * from plugin teardown so adapted wallets never outlive the app.
   * Idempotent; wallets stay connected, only event delivery stops.
   */
  function disposeAllAdaptedWallets() {
    for (const adapter of trackedAdapters) {
      adapter.dispose?.();
    }
  }

  return {
    getAdaptedWallet,
    getDiscoveredWallets,
    handleIosWalletCallback,
    disposeAllAdaptedWallets,
  };
}

function isObject(value: unknown): value is object {
  return (typeof value === "object" && value !== null) || typeof value === "function";
}

function getPrimitiveWalletKey(walletInfo: SolanaWalletInfo) {
  return `${walletInfo.name}::${String(walletInfo.wallet)}`;
}

/**
 * Identity of a discovered wallet across `refreshWallets()` rebuilds: the info
 * objects are recreated on every refresh, but the wallet objects they wrap are
 * the same. Metadata is the fallback because an extension that unregisters and
 * re-registers (an update, for example) comes back as a *new* wallet object;
 * identity alone would then classify the wallet we just connected as another
 * wallet and deauthorize it. Names are unique per wallet in practice, and
 * `source` keeps a browser extension apart from an iOS deep link of the same
 * name.
 */
function isSameWalletInfo(a: SolanaWalletInfo, b: SolanaWalletInfo): boolean {
  return a.wallet === b.wallet || (a.name === b.name && a.source === b.source);
}
