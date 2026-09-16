import type { Address } from "../kit";
import type { SolanaWallet, SolanaWalletInfo } from "../types";
import {
  DEFAULT_IOS_WALLET_CHAINS,
  getDefaultIosWalletRedirectUrl,
  isSolanaIosBrowserWalletSupported,
  waitForRedirect,
} from "./browser";
import { handleSolanaIosWalletCallback } from "./callback";
import { IOS_WALLETS, isIosWalletDefinition } from "./definitions";
import {
  launchConnect,
  launchSignAllTransactions,
  launchSignAndSendTransaction,
  launchSignTransaction,
} from "./deep-links";
import { getStoredIosWalletAccount, getStoredSession, removeStoredSession } from "./storage";
import type {
  AdaptSolanaIosWalletOptions,
  GetSolanaIosWalletsOptions,
  IosWalletInfo,
} from "./types";

export function getSolanaIosWallets(options: GetSolanaIosWalletsOptions = {}): SolanaWalletInfo[] {
  if (!isSolanaIosBrowserWalletSupported()) {
    return [];
  }

  const chains = options.chains?.length ? options.chains : DEFAULT_IOS_WALLET_CHAINS;
  const callbackUrl = options.redirectUrl ?? getDefaultIosWalletRedirectUrl();

  return IOS_WALLETS.map((wallet) => ({
    name: wallet.name,
    icon: wallet.icon,
    chains,
    platform: "mobile",
    source: "deep-link",
    appUrl: wallet.appUrl,
    installUrl: wallet.installUrl,
    callbackUrl,
    capabilities: {
      connect: true,
      disconnect: true,
      signTransaction: Boolean(wallet.signTransactionUrl),
      signAllTransactions: Boolean(wallet.signAllTransactionsUrl),
      signAndSendTransaction: Boolean(wallet.signAndSendTransactionUrl),
    },
    accounts: getStoredIosWalletAccount(wallet.id, chains),
    wallet,
  }));
}

export function adaptSolanaIosWallet(
  walletInfo: SolanaWalletInfo,
  options: AdaptSolanaIosWalletOptions = {},
): SolanaWallet {
  const definition = getIosWalletDefinition(walletInfo);
  let connecting = false;
  let disconnecting = false;
  let session = getStoredSession(definition.id);

  function refreshSession() {
    session = getStoredSession(definition.id);
    options.onChange?.();
  }

  return {
    get publicKey() {
      return session?.publicKey ? (session.publicKey as Address) : null;
    },
    get connected() {
      return Boolean(session?.publicKey && session.session);
    },
    get connecting() {
      return connecting;
    },
    get disconnecting() {
      return disconnecting;
    },
    async connect() {
      const callback = handleSolanaIosWalletCallback({ clearUrl: true });

      if (callback?.walletId === definition.id) {
        refreshSession();
        return;
      }

      connecting = true;
      options.onChange?.();

      try {
        launchConnect(definition, options);
        await waitForRedirect();
      } finally {
        connecting = false;
        options.onChange?.();
      }
    },
    async disconnect() {
      disconnecting = true;
      options.onChange?.();

      try {
        removeStoredSession(definition.id);
        refreshSession();
      } finally {
        disconnecting = false;
        options.onChange?.();
      }
    },
    signTransaction: definition.signTransactionUrl
      ? async (transaction) => {
          return launchSignTransaction(definition, transaction, options);
        }
      : undefined,
    signAllTransactions: definition.signAllTransactionsUrl
      ? async (transactions) => {
          const signedTransactions = await launchSignAllTransactions(
            definition,
            transactions,
            options,
          );

          if (signedTransactions.length !== transactions.length) {
            throw new Error(
              `iOS wallet returned ${signedTransactions.length} signed transactions for ${transactions.length} requested transactions`,
            );
          }

          return signedTransactions;
        }
      : undefined,
    signAndSendTransaction: definition.signAndSendTransactionUrl
      ? async (transaction, sendOptions) =>
          launchSignAndSendTransaction(definition, transaction, sendOptions, options)
      : undefined,
  };
}

export function isSolanaIosWalletInfo(walletInfo: SolanaWalletInfo): walletInfo is IosWalletInfo {
  return walletInfo.source === "deep-link" && isIosWalletDefinition(walletInfo.wallet);
}

function getIosWalletDefinition(walletInfo: SolanaWalletInfo) {
  if (!isIosWalletDefinition(walletInfo.wallet)) {
    throw new Error("Solana wallet info is not an iOS wallet");
  }

  return walletInfo.wallet;
}
