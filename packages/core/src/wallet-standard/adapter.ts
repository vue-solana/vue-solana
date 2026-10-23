import type { Wallet, WalletAccount } from "@wallet-standard/base";
import { StandardConnect, StandardDisconnect, StandardEvents } from "@wallet-standard/features";
import {
  SolanaSignAndSendTransaction,
  SolanaSignIn,
  SolanaSignMessage,
  SolanaSignTransaction,
} from "@solana/wallet-standard-features";
import type { SolanaSignInInput, SolanaSignInOutput } from "@solana/wallet-standard-features";
import { getBase58Decoder } from "@solana/kit";
import type { Address } from "../kit";
import { createSolanaError } from "../errors";
import { assertWalletSignature } from "./verify-wallet-signature";
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

/**
 * A Wallet Standard wallet adapted to {@link SolanaWallet}. `dispose` is
 * always present here (optional on the base interface, where plain
 * caller-supplied wallets typically omit it).
 */
export interface AdaptedSolanaWallet extends SolanaWallet {
  dispose(): void;
}

export function adaptSolanaStandardWallet(
  walletInfo: SolanaWalletInfo,
  options: AdaptSolanaWalletOptions = {},
): AdaptedSolanaWallet {
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
  const unsubscribeChange = eventsFeature?.on("change", (properties) => {
    if (properties.accounts) {
      accounts = properties.accounts;
      account =
        allowAccountUpdates && !manuallyDisconnected
          ? getSolanaAccount(accounts, options.chain)
          : undefined;
      options.onChange?.();
    }
  });

  function dispose() {
    unsubscribeChange?.();
  }

  return {
    platform: walletInfo.platform,
    source: walletInfo.source,
    dispose,
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
          const [result] = await wallet.features[SolanaSignIn].signIn(
            input ?? getDefaultSignInInput(getActiveAccount(account)),
          );

          if (!result) {
            throw new Error("Solana wallet did not return a sign-in result");
          }

          const signInResult = toSolanaSignInResult(result);

          // An omitted input is built from the active account, so the account
          // the caller is asking about is either `input.address` or the active
          // one. Verifying only the returned account let a wallet answer with a
          // *different* account it controls, sign for itself, and pass.
          const requestedAddress = input?.address ?? account?.address;
          const signInAccount = accounts.find(
            (candidate) => candidate.address === signInResult.account.address,
          );

          if (!signInAccount) {
            throw createSolanaError(
              "INVALID_SIGNATURE",
              "The wallet returned a sign-in account it does not expose.",
            );
          }

          if (requestedAddress !== undefined && requestedAddress !== signInAccount.address) {
            throw createSolanaError(
              "INVALID_SIGNATURE",
              `The wallet signed in as ${signInResult.account.address} instead of the requested ${requestedAddress}.`,
            );
          }

          await assertWalletSignature(
            signInAccount.publicKey,
            signInResult.signedMessage,
            signInResult.signature,
            "sign-in",
          );

          return signInResult;
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

          await assertWalletSignature(
            activeAccount.publicKey,
            result.signedMessage,
            result.signature,
            "message",
          );

          return result;
        }
      : undefined,
    signTransaction: hasSignTransaction(wallet)
      ? async (transaction) => {
          const activeAccount = getActiveAccount(account);
          const [result] = await wallet.features[SolanaSignTransaction].signTransaction({
            account: activeAccount,
            transaction: new Uint8Array(transaction),
            chain: options.chain,
          });

          if (!result) {
            throw new Error("Solana wallet did not return a signed transaction");
          }

          return result.signedTransaction;
        }
      : undefined,
    signAllTransactions: hasSignTransaction(wallet)
      ? async (transactions) =>
          signAllThroughFeature(
            wallet as Wallet & { features: SolanaSignTransactionFeature },
            () => getActiveAccount(account),
            transactions,
            options.chain,
          )
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
            transaction: new Uint8Array(transaction),
            chain: options.chain ?? getSolanaAccountChain(activeAccount),
            options: sendOptions,
          });

          if (!result) {
            throw new Error("Solana wallet did not return a transaction signature");
          }

          return { signature: getBase58Decoder().decode(result.signature) };
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
              transaction: new Uint8Array(transaction),
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

            return getBase58Decoder().decode(result.signature);
          });
        }
      : undefined,
  };
}

/**
 * Disconnects a discovered Wallet Standard wallet without adapting it.
 *
 * Reads `standard:disconnect` straight off the wallet instead of going through
 * an adapter on purpose: a wallet the app authorized in an earlier page session
 * has no adapter yet, so an adapter-only sweep misses it, and adapting it just
 * to disconnect would register a `change` subscription for a wallet the user
 * never selects. Resolves `false` when the wallet exposes no disconnect feature
 * (for example an iOS deep-link definition); rejects with the wallet's own
 * error, so a caller sweeping a list should catch per wallet.
 */
export async function disconnectSolanaStandardWallet(
  walletInfo: SolanaWalletInfo,
): Promise<boolean> {
  const wallet = walletInfo.wallet as Partial<Wallet> | null | undefined;

  if (typeof wallet !== "object" && typeof wallet !== "function") {
    return false;
  }

  const features = wallet?.features as Record<string, unknown> | undefined;
  const feature = features?.[StandardDisconnect] as
    | StandardDisconnectFeature[typeof StandardDisconnect]
    | undefined;

  if (typeof feature?.disconnect !== "function") {
    return false;
  }

  await feature.disconnect();
  return true;
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
      transaction: new Uint8Array(transaction),
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

/**
 * Always send a complete sign-in request: Phantom resolves an empty result
 * without opening any popup when `solana:signIn` gets no input. `host` (not
 * `origin`) is what the request domain has to be for Backpack not to warn that
 * the domain does not match the requesting one.
 */
function getDefaultSignInInput(account: WalletAccount): SolanaSignInInput {
  return {
    domain: typeof location === "undefined" ? "" : location.host,
    address: account.address,
  };
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
