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
}

export function createSolanaWalletRegistry(options: SolanaWalletRegistryOptions) {
  const adaptedWallets = new WeakMap<object, SolanaWallet>();

  function getAdaptedWallet(walletInfo: SolanaWalletInfo) {
    if (isSolanaIosWalletInfo(walletInfo)) {
      return adaptSolanaIosWallet(walletInfo, {
        chain: getSolanaChain(options.cluster),
        cluster: options.cluster,
        onChange: options.onWalletChange,
        ...(options.iosWallet || {}),
      });
    }

    if (!isObject(walletInfo.wallet)) {
      return adaptSolanaStandardWallet(walletInfo, {
        chain: getSolanaChain(options.cluster),
        onChange: options.onWalletChange,
      });
    }

    const cachedWallet = adaptedWallets.get(walletInfo.wallet);

    if (cachedWallet) {
      return cachedWallet;
    }

    const adaptedWallet = adaptSolanaStandardWallet(walletInfo, {
      chain: getSolanaChain(options.cluster),
      onChange: options.onWalletChange,
    });
    const cachedAdapter: SolanaWallet = {
      platform: walletInfo.platform,
      source: walletInfo.source,
      get publicKey() {
        return adaptedWallet.publicKey;
      },
      get connected() {
        return adaptedWallet.connected;
      },
      get connecting() {
        return adaptedWallet.connecting;
      },
      get disconnecting() {
        return adaptedWallet.disconnecting;
      },
      async connect() {
        await adaptedWallet.connect();

        await Promise.all(
          Array.from(getCachedWallets()).map((otherWallet) =>
            otherWallet !== cachedAdapter && otherWallet.connected
              ? otherWallet.disconnect()
              : undefined,
          ),
        );
      },
      disconnect: () => adaptedWallet.disconnect(),
      signTransaction: adaptedWallet.signTransaction?.bind(adaptedWallet),
      signAllTransactions: adaptedWallet.signAllTransactions?.bind(adaptedWallet),
      signAndSendTransaction: adaptedWallet.signAndSendTransaction?.bind(adaptedWallet),
    };

    adaptedWallets.set(walletInfo.wallet, cachedAdapter);
    return cachedAdapter;
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
      console.error("[Vue Solana] iOS wallet callback failed", cause);
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

  return {
    getAdaptedWallet,
    getDiscoveredWallets,
    handleIosWalletCallback,
  };
}

function isObject(value: unknown): value is object {
  return (typeof value === "object" && value !== null) || typeof value === "function";
}
