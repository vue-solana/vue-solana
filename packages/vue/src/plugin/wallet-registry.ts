import {
  adaptSolanaIosWallet,
  getSolanaIosWallets,
  handleSolanaIosWalletCallback,
  isSolanaIosWalletInfo,
  type GetSolanaIosWalletsOptions,
} from "@vue-solana/core/ios-wallet";
import {
  adaptSolanaStandardWallet,
  getRegisteredSolanaWallets,
  getSolanaChain,
} from "@vue-solana/core/wallet-standard";
import type { SolanaCluster, SolanaWallet, SolanaWalletInfo } from "@vue-solana/core/types";

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

      const iosAdapter = adaptSolanaIosWallet(walletInfo, {
        chain: getSolanaChain(options.cluster),
        cluster: options.cluster,
        onChange: options.onWalletChange,
        ...(options.iosWallet || {}),
      });
      adaptedWallets.set(walletInfo.wallet, iosAdapter);
      return trackAdapter(iosAdapter);
    }

    if (!isObject(walletInfo.wallet)) {
      const primitiveKey = `${walletInfo.name}::${String(walletInfo.wallet)}`;
      const cachedPrimitiveWallet = adaptedPrimitiveWallets.get(primitiveKey);

      if (cachedPrimitiveWallet) {
        return cachedPrimitiveWallet;
      }

      const primitiveAdapter = adaptSolanaStandardWallet(walletInfo, {
        chain: getSolanaChain(options.cluster),
        onChange: options.onWalletChange,
      });
      adaptedPrimitiveWallets.set(primitiveKey, primitiveAdapter);
      return trackAdapter(primitiveAdapter);
    }

    const cachedWallet = adaptedWallets.get(walletInfo.wallet);

    if (cachedWallet) {
      return cachedWallet;
    }

    const adaptedWallet = adaptSolanaStandardWallet(walletInfo, {
      chain: getSolanaChain(options.cluster),
      onChange: options.onWalletChange,
    });
    // Everything but `connect` forwards straight through; `connect` also drops
    // every other connected cached wallet.
    const cachedAdapter = new Proxy(adaptedWallet, {
      get(target, property) {
        if (property === "connect") {
          return connectAndDisconnectOthers;
        }

        const value: unknown = Reflect.get(target, property);

        return typeof value === "function" ? value.bind(target) : value;
      },
    });

    async function connectAndDisconnectOthers() {
      await adaptedWallet.connect();

      await Promise.all(
        Array.from(getCachedWallets()).map((otherWallet) =>
          otherWallet !== cachedAdapter && otherWallet.connected
            ? otherWallet.disconnect()
            : undefined,
        ),
      );
    }

    adaptedWallets.set(walletInfo.wallet, cachedAdapter);
    return trackAdapter(cachedAdapter);
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

  function* getCachedWallets() {
    for (const walletInfo of options.getWalletInfos()) {
      if (isObject(walletInfo.wallet)) {
        const cachedWallet = adaptedWallets.get(walletInfo.wallet);

        if (cachedWallet) {
          yield cachedWallet;
        }
      }
    }
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
