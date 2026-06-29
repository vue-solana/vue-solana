import { PublicKey } from "@solana/web3-compat";
import bs58 from "bs58";
import type {
  SendTransactionOptions,
  SolanaTransaction,
  SolanaWallet,
  SolanaWalletInfo,
} from "../types";
import {
  DEFAULT_IOS_WALLET_CHAINS,
  getDefaultIosWalletAppIdentity,
  getDefaultIosWalletRedirectUrl,
  isSolanaIosBrowserWalletSupported,
  openIosWalletUrl,
  waitForRedirect,
} from "./browser";
import { handleSolanaIosWalletCallback } from "./callback";
import { encryptPayload, nacl } from "./crypto";
import { IOS_WALLETS, isIosWalletDefinition } from "./definitions";
import {
  createPendingRequest,
  getStoredIosWalletAccount,
  getStoredSession,
  removeStoredSession,
  storePendingRequest,
} from "./storage";
import { deserializeTransaction, serializeTransaction } from "./transactions";
import type {
  AdaptSolanaIosWalletOptions,
  GetSolanaIosWalletsOptions,
  IosWalletDefinition,
  IosWalletSignMethod,
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
      return session?.publicKey ? new PublicKey(session.publicKey) : null;
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
      ? async <T extends SolanaTransaction>(transaction: T): Promise<T> => {
          const signedTransaction = await launchSignTransaction(definition, transaction, options);

          return deserializeTransaction(transaction, signedTransaction) as T;
        }
      : undefined,
    signAllTransactions: definition.signAllTransactionsUrl
      ? async <T extends SolanaTransaction>(transactions: T[]): Promise<T[]> => {
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

          return signedTransactions.map((transaction, index) =>
            deserializeTransaction(transactions[index], transaction),
          ) as T[];
        }
      : undefined,
    signAndSendTransaction: definition.signAndSendTransactionUrl
      ? async (transaction, sendOptions) =>
          launchSignAndSendTransaction(definition, transaction, sendOptions, options)
      : undefined,
  };
}

export function isSolanaIosWalletInfo(walletInfo: SolanaWalletInfo): boolean {
  return walletInfo.source === "deep-link" && isIosWalletDefinition(walletInfo.wallet);
}

function launchConnect(definition: IosWalletDefinition, options: AdaptSolanaIosWalletOptions) {
  const keyPair = nacl.box.keyPair();
  const pending = createPendingRequest(definition.id, "connect", keyPair, options.redirectUrl);
  const appIdentity = options.appIdentity ?? getDefaultIosWalletAppIdentity();
  const url = new URL(definition.connectUrl);

  url.searchParams.set("app_url", appIdentity.uri);
  url.searchParams.set("dapp_encryption_public_key", pending.dappEncryptionPublicKey);
  url.searchParams.set("redirect_link", pending.redirectUrl);

  if (options.cluster && options.cluster !== "localnet") {
    url.searchParams.set("cluster", options.cluster);
  }

  storePendingRequest(pending);
  openIosWalletUrl(url.toString());
}

async function launchSignTransaction(
  definition: IosWalletDefinition,
  transaction: SolanaTransaction,
  options: AdaptSolanaIosWalletOptions,
): Promise<Uint8Array> {
  const response = await launchEncryptedWalletRequest(definition, "signTransaction", options, {
    transaction: bs58.encode(serializeTransaction(transaction)),
  });

  if (!response.transaction) {
    throw new Error("iOS wallet did not return a signed transaction");
  }

  return response.transaction;
}

async function launchSignAllTransactions(
  definition: IosWalletDefinition,
  transactions: SolanaTransaction[],
  options: AdaptSolanaIosWalletOptions,
): Promise<Uint8Array[]> {
  const response = await launchEncryptedWalletRequest(definition, "signAllTransactions", options, {
    transactions: transactions.map((transaction) => bs58.encode(serializeTransaction(transaction))),
  });

  if (!response.transactions) {
    throw new Error("iOS wallet did not return signed transactions");
  }

  return response.transactions;
}

async function launchSignAndSendTransaction(
  definition: IosWalletDefinition,
  transaction: SolanaTransaction,
  sendOptions: SendTransactionOptions | undefined,
  options: AdaptSolanaIosWalletOptions,
): Promise<{ signature: string }> {
  const response = await launchEncryptedWalletRequest(
    definition,
    "signAndSendTransaction",
    options,
    {
      transaction: bs58.encode(serializeTransaction(transaction)),
      sendOptions,
    },
  );

  if (!response.signature) {
    throw new Error("iOS wallet did not return a transaction signature");
  }

  return { signature: response.signature };
}

async function launchEncryptedWalletRequest(
  definition: IosWalletDefinition,
  method: IosWalletSignMethod,
  options: AdaptSolanaIosWalletOptions,
  payload: Record<string, unknown>,
) {
  const session = getStoredSession(definition.id);

  if (!session) {
    throw new Error("Connect the iOS wallet before signing");
  }

  const methodUrl = getIosWalletMethodUrl(definition, method);
  const pending = createPendingRequest(
    definition.id,
    method,
    {
      publicKey: bs58.decode(session.dappEncryptionPublicKey),
      secretKey: bs58.decode(session.dappEncryptionSecretKey),
    },
    options.redirectUrl,
    method === "signAllTransactions" && Array.isArray(payload.transactions)
      ? payload.transactions.length
      : undefined,
  );
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const encryptedPayload = encryptPayload(
    { ...payload, session: session.session },
    nonce,
    bs58.decode(session.sharedSecret),
  );
  const url = new URL(methodUrl);

  url.searchParams.set("dapp_encryption_public_key", session.dappEncryptionPublicKey);
  url.searchParams.set("nonce", bs58.encode(nonce));
  url.searchParams.set("redirect_link", pending.redirectUrl);
  url.searchParams.set("payload", encryptedPayload);

  storePendingRequest(pending);
  openIosWalletUrl(url.toString());

  return waitForRedirect<NonNullable<ReturnType<typeof handleSolanaIosWalletCallback>>>();
}

function getIosWalletMethodUrl(definition: IosWalletDefinition, method: IosWalletSignMethod) {
  const url = definition[`${method}Url`];

  if (!url) {
    throw new Error(`${definition.name} does not support ${method} through iOS deeplinks`);
  }

  return url;
}

function getIosWalletDefinition(walletInfo: SolanaWalletInfo) {
  if (!isIosWalletDefinition(walletInfo.wallet)) {
    throw new Error("Solana wallet info is not an iOS wallet");
  }

  return walletInfo.wallet;
}
