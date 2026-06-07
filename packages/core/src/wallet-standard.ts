import { getWallets } from "@wallet-standard/app";
import { SolanaMobileWalletAdapterWalletName } from "@solana-mobile/wallet-standard-mobile";
import type { Wallet, WalletAccount } from "@wallet-standard/base";
import { StandardConnect, StandardDisconnect, StandardEvents } from "@wallet-standard/features";
import {
  SolanaSignAndSendTransaction,
  SolanaSignTransaction,
} from "@solana/wallet-standard-features";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3-compat";
import bs58 from "bs58";
import type {
  SendTransactionOptions,
  SolanaChain,
  SolanaCluster,
  SolanaTransaction,
  SolanaWallet,
  SolanaWalletInfo,
} from "./types";

const SOLANA_CHAINS: readonly SolanaChain[] = [
  "solana:mainnet",
  "solana:testnet",
  "solana:devnet",
  "solana:localnet",
];

export interface AdaptSolanaWalletOptions {
  chain?: SolanaChain;
  account?: WalletAccount;
  onChange?: () => void;
}

type StandardConnectFeature = {
  [StandardConnect]: {
    connect(input?: { silent?: boolean }): Promise<{ accounts: readonly WalletAccount[] }>;
  };
};

type StandardDisconnectFeature = {
  [StandardDisconnect]: {
    disconnect(): Promise<void>;
  };
};

type StandardEventsFeature = {
  [StandardEvents]: {
    on(
      event: "change",
      listener: (properties: { accounts?: readonly WalletAccount[] }) => void,
    ): () => void;
  };
};

type SolanaSignTransactionFeature = {
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

type SolanaSignAndSendTransactionFeature = {
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

export function getSolanaChain(cluster: SolanaCluster): SolanaChain {
  if (cluster === "mainnet-beta") {
    return "solana:mainnet";
  }

  return `solana:${cluster}`;
}

export function isSolanaStandardWallet(wallet: Wallet): boolean {
  return (
    StandardConnect in wallet.features &&
    StandardDisconnect in wallet.features &&
    wallet.chains.some((chain) => SOLANA_CHAINS.includes(chain as SolanaChain))
  );
}

export function getRegisteredSolanaWallets(): SolanaWalletInfo[] {
  if (typeof window === "undefined") {
    return [];
  }

  return getWallets().get().filter(isSolanaStandardWallet).map(createSolanaWalletInfo);
}

export function subscribeSolanaWallets(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const wallets = getWallets();
  const offRegister = wallets.on("register", listener);
  const offUnregister = wallets.on("unregister", listener);

  return () => {
    offRegister();
    offUnregister();
  };
}

export function adaptSolanaStandardWallet(
  walletInfo: SolanaWalletInfo,
  options: AdaptSolanaWalletOptions = {},
): SolanaWallet {
  const wallet = walletInfo.wallet as Wallet;
  let accounts = wallet.accounts;
  let account = options.account;
  let allowAccountUpdates = Boolean(options.account);
  let connecting = false;
  let disconnecting = false;
  let manuallyDisconnected = false;

  const eventsFeature = wallet.features[StandardEvents] as
    | StandardEventsFeature[typeof StandardEvents]
    | undefined;
  eventsFeature?.on("change", (properties) => {
    if (properties.accounts) {
      accounts = properties.accounts;
      account =
        allowAccountUpdates && !manuallyDisconnected
          ? getSolanaAccount(accounts, options.chain)
          : undefined;
      options.onChange?.();
    }
  });

  return {
    get publicKey() {
      return account ? new PublicKey(account.publicKey) : null;
    },
    get connected() {
      return Boolean(account);
    },
    get connecting() {
      return connecting;
    },
    get disconnecting() {
      return disconnecting;
    },
    async connect() {
      connecting = true;
      manuallyDisconnected = false;
      options.onChange?.();

      try {
        const feature = wallet.features[
          StandardConnect
        ] as StandardConnectFeature[typeof StandardConnect];
        const result = await feature.connect();

        accounts = result.accounts;
        allowAccountUpdates = true;
        account = getSolanaAccount(accounts, options.chain);

        if (!account) {
          throw new Error("Solana wallet did not authorize a Solana account");
        }
      } finally {
        connecting = false;
        options.onChange?.();
      }
    },
    async disconnect() {
      const feature = wallet.features[
        StandardDisconnect
      ] as StandardDisconnectFeature[typeof StandardDisconnect];

      disconnecting = true;
      manuallyDisconnected = true;
      allowAccountUpdates = false;
      account = undefined;
      options.onChange?.();

      try {
        await feature.disconnect();
        accounts = [];
        account = undefined;
      } catch (error) {
        manuallyDisconnected = false;
        allowAccountUpdates = true;
        account = getSolanaAccount(accounts, options.chain);
        throw error;
      } finally {
        disconnecting = false;
        options.onChange?.();
      }
    },
    signTransaction: hasSignTransaction(wallet)
      ? async <T extends SolanaTransaction>(transaction: T): Promise<T> => {
          const activeAccount = getActiveAccount(account);
          const [result] = await wallet.features[SolanaSignTransaction].signTransaction({
            account: activeAccount,
            transaction: serializeTransaction(transaction),
            chain: options.chain,
          });

          if (!result) {
            throw new Error("Solana wallet did not return a signed transaction");
          }

          return deserializeTransaction(transaction, result.signedTransaction) as T;
        }
      : undefined,
    signAllTransactions: hasSignTransaction(wallet)
      ? async <T extends SolanaTransaction>(transactions: T[]): Promise<T[]> => {
          const activeAccount = getActiveAccount(account);
          const results = await wallet.features[SolanaSignTransaction].signTransaction(
            ...transactions.map((transaction) => ({
              account: activeAccount,
              transaction: serializeTransaction(transaction),
              chain: options.chain,
            })),
          );

          return results.map((result, index) =>
            deserializeTransaction(transactions[index], result.signedTransaction),
          ) as T[];
        }
      : undefined,
    signAndSendTransaction: hasSignAndSendTransaction(wallet)
      ? async (transaction, sendOptions) => {
          const activeAccount = getActiveAccount(account);
          const [result] = await wallet.features[
            SolanaSignAndSendTransaction
          ].signAndSendTransaction({
            account: activeAccount,
            transaction: serializeTransaction(transaction),
            chain: options.chain ?? getSolanaAccountChain(activeAccount),
            options: sendOptions,
          });

          if (!result) {
            throw new Error("Solana wallet did not return a transaction signature");
          }

          return { signature: bs58.encode(result.signature) };
        }
      : undefined,
  };
}

function createSolanaWalletInfo(wallet: Wallet): SolanaWalletInfo {
  const isMobileWallet = wallet.name === SolanaMobileWalletAdapterWalletName;

  return {
    name: wallet.name,
    icon: wallet.icon,
    chains: wallet.chains,
    platform: isMobileWallet ? "mobile" : "browser",
    source: isMobileWallet ? "mobile-wallet-adapter" : "wallet-standard",
    appUrl: getWalletUrl(wallet),
    accounts: wallet.accounts.map((account) => ({
      address: account.address,
      publicKey: Uint8Array.from(account.publicKey),
      chains: account.chains,
      label: account.label,
      icon: account.icon,
    })),
    wallet,
  };
}

function getWalletUrl(wallet: Wallet): string | undefined {
  return "url" in wallet && typeof wallet.url === "string" ? wallet.url : undefined;
}

function getSolanaAccount(
  accounts: readonly WalletAccount[],
  chain?: SolanaChain,
): WalletAccount | undefined {
  return (
    accounts.find((account) => account.chains.some((accountChain) => accountChain === chain)) ??
    accounts.find((account) =>
      account.chains.some((accountChain) => SOLANA_CHAINS.includes(accountChain as SolanaChain)),
    )
  );
}

function getActiveAccount(account: WalletAccount | undefined): WalletAccount {
  if (!account) {
    throw new Error("Solana wallet is not connected");
  }

  return account;
}

function getSolanaAccountChain(account: WalletAccount): SolanaChain {
  const chain = account.chains.find((accountChain) =>
    SOLANA_CHAINS.includes(accountChain as SolanaChain),
  );

  if (!chain) {
    throw new Error("Solana wallet account does not support a Solana chain");
  }

  return chain as SolanaChain;
}

function hasSignTransaction(
  wallet: Wallet,
): wallet is Wallet & { features: SolanaSignTransactionFeature } {
  return SolanaSignTransaction in wallet.features;
}

function hasSignAndSendTransaction(
  wallet: Wallet,
): wallet is Wallet & { features: SolanaSignAndSendTransactionFeature } {
  return SolanaSignAndSendTransaction in wallet.features;
}

function serializeTransaction(transaction: SolanaTransaction): Uint8Array {
  if (transaction instanceof Transaction) {
    return transaction.serialize({ requireAllSignatures: false, verifySignatures: false });
  }

  return transaction.serialize();
}

function deserializeTransaction(source: SolanaTransaction, bytes: Uint8Array): SolanaTransaction {
  if (source instanceof Transaction) {
    return Transaction.from(bytes);
  }

  return VersionedTransaction.deserialize(bytes);
}
