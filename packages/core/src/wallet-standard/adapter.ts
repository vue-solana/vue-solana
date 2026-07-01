import type { Wallet, WalletAccount } from "@wallet-standard/base";
import { StandardConnect, StandardDisconnect, StandardEvents } from "@wallet-standard/features";
import {
  SolanaSignAndSendTransaction,
  SolanaSignMessage,
  SolanaSignTransaction,
} from "@solana/wallet-standard-features";
import { PublicKey } from "@solana/web3-compat";
import bs58 from "bs58";
import type { SolanaChain, SolanaTransaction, SolanaWallet, SolanaWalletInfo } from "../types";
import { SOLANA_CHAINS } from "./chains";
import {
  hasSignAndSendTransaction,
  hasSignMessage,
  hasSignTransaction,
  type StandardConnectFeature,
  type StandardDisconnectFeature,
  type StandardEventsFeature,
} from "./features";
import { deserializeTransaction, serializeTransaction } from "./transactions";

export interface AdaptSolanaWalletOptions {
  chain?: SolanaChain;
  account?: WalletAccount;
  onChange?: () => void;
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
    platform: walletInfo.platform,
    source: walletInfo.source,
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
    signMessage: hasSignMessage(wallet)
      ? async (message) => {
          const activeAccount = getActiveAccount(account);
          const [result] = await wallet.features[SolanaSignMessage].signMessage({
            account: activeAccount,
            message,
          });

          if (!result) {
            throw new Error("Solana wallet did not return a message signature");
          }

          return result;
        }
      : undefined,
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

          if (results.length !== transactions.length) {
            throw new Error(
              `Solana wallet returned ${results.length} signed transactions for ${transactions.length} requested transactions`,
            );
          }

          return results.map((result, index) => {
            if (!result) {
              throw new Error("Solana wallet did not return a signed transaction");
            }

            return deserializeTransaction(transactions[index], result.signedTransaction);
          }) as T[];
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
