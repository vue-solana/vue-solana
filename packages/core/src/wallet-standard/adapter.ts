import type { Wallet, WalletAccount } from "@wallet-standard/base";
import { StandardConnect, StandardDisconnect, StandardEvents } from "@wallet-standard/features";
import {
  SolanaSignAndSendTransaction,
  SolanaSignIn,
  SolanaSignMessage,
  SolanaSignTransaction,
} from "@solana/wallet-standard-features";
import type { SolanaSignInInput, SolanaSignInOutput } from "@solana/wallet-standard-features";
import bs58 from "bs58";
import type { Address } from "../kit";
import type {
  SolanaChain,
  SolanaSignInResult,
  SolanaTransaction,
  SolanaWallet,
  SolanaWalletInfo,
} from "../types";
import { SOLANA_CHAINS } from "./chains";
import {
  hasSignAndSendTransaction,
  hasSignIn,
  hasSignMessage,
  hasSignTransaction,
  type SolanaSignTransactionFeature,
  type StandardConnectFeature,
  type StandardDisconnectFeature,
  type StandardEventsFeature,
} from "./features";

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
      return account ? (account.address as Address) : null;
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
    signIn: hasSignIn(wallet)
      ? async (input?: SolanaSignInInput): Promise<SolanaSignInResult> => {
          const [result] = await wallet.features[SolanaSignIn].signIn(...(input ? [input] : []));

          if (!result) {
            throw new Error("Solana wallet did not return a sign-in result");
          }

          return toSolanaSignInResult(result);
        }
      : undefined,
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
      ? async (transaction) => {
          const activeAccount = getActiveAccount(account);
          const [result] = await wallet.features[SolanaSignTransaction].signTransaction({
            account: activeAccount,
            transaction,
            chain: options.chain,
          });

          if (!result) {
            throw new Error("Solana wallet did not return a signed transaction");
          }

          return result.signedTransaction;
        }
      : undefined,
    signAllTransactions: hasSignTransaction(wallet)
      ? async (transactions) => {
          const activeAccount = getActiveAccount(account);
          const results = await wallet.features[SolanaSignTransaction].signTransaction(
            ...transactions.map((transaction) => ({
              account: activeAccount,
              transaction,
              chain: options.chain,
            })),
          );

          if (results.length !== transactions.length) {
            throw new Error(
              `Solana wallet returned ${results.length} signed transactions for ${transactions.length} requested transactions`,
            );
          }

          return results.map((result) => {
            if (!result) {
              throw new Error("Solana wallet did not return a signed transaction");
            }

            return result.signedTransaction;
          });
        }
      : undefined,
    signTransactions: hasSignTransaction(wallet)
      ? async (transactions) =>
          signAllThroughFeature(
            wallet as Wallet & { features: SolanaSignTransactionFeature },
            () => getActiveAccount(account),
            transactions,
            options.chain,
          )
      : undefined,
    signAndSendTransaction: hasSignAndSendTransaction(wallet)
      ? async (transaction, sendOptions) => {
          const activeAccount = getActiveAccount(account);
          const [result] = await wallet.features[
            SolanaSignAndSendTransaction
          ].signAndSendTransaction({
            account: activeAccount,
            transaction,
            chain: options.chain ?? getSolanaAccountChain(activeAccount),
            options: sendOptions,
          });

          if (!result) {
            throw new Error("Solana wallet did not return a transaction signature");
          }

          return { signature: bs58.encode(result.signature) };
        }
      : undefined,
    signAndSendTransactions: hasSignAndSendTransaction(wallet)
      ? async (transactions, sendOptions) => {
          const activeAccount = getActiveAccount(account);
          const results = await wallet.features[
            SolanaSignAndSendTransaction
          ].signAndSendTransaction(
            ...transactions.map((transaction) => ({
              account: activeAccount,
              transaction,
              chain: options.chain ?? getSolanaAccountChain(activeAccount),
              options: sendOptions,
            })),
          );

          if (results.length !== transactions.length) {
            throw new Error(
              `Solana wallet returned ${results.length} signatures for ${transactions.length} requested transactions`,
            );
          }

          return results.map((result) => {
            if (!result) {
              throw new Error("Solana wallet did not return a transaction signature");
            }

            return bs58.encode(result.signature);
          });
        }
      : undefined,
  };
}

async function signAllThroughFeature(
  wallet: Wallet & { features: SolanaSignTransactionFeature },
  getAccount: () => WalletAccount,
  transactions: readonly SolanaTransaction[],
  chain: SolanaChain | undefined,
): Promise<SolanaTransaction[]> {
  const activeAccount = getAccount();
  const results = await wallet.features[SolanaSignTransaction].signTransaction(
    ...transactions.map((transaction) => ({
      account: activeAccount,
      transaction,
      chain,
    })),
  );

  if (results.length !== transactions.length) {
    throw new Error(
      `Solana wallet returned ${results.length} signed transactions for ${transactions.length} requested transactions`,
    );
  }

  return results.map((result) => {
    if (!result) {
      throw new Error("Solana wallet did not return a signed transaction");
    }

    return result.signedTransaction;
  });
}

function toSolanaSignInResult(result: SolanaSignInOutput): SolanaSignInResult {
  return {
    account: {
      address: result.account.address as Address,
      publicKey: Uint8Array.from(result.account.publicKey),
      chains: [...result.account.chains],
      label: result.account.label,
      icon: result.account.icon,
    },
    signedMessage: result.signedMessage,
    signature: result.signature,
    signatureType: result.signatureType,
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
