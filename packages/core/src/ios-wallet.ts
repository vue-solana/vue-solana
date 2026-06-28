import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3-compat";
import bs58 from "bs58";
import * as naclModule from "tweetnacl";
import type {
  SendTransactionOptions,
  SolanaChain,
  SolanaCluster,
  SolanaTransaction,
  SolanaWallet,
  SolanaWalletInfo,
} from "./types";

const nacl = resolveTweetNaCl();

export interface SolanaIosWalletAppIdentity {
  name: string;
  uri: string;
  icon?: string;
}

export interface GetSolanaIosWalletsOptions {
  appIdentity?: SolanaIosWalletAppIdentity;
  redirectUrl?: string;
  chains?: readonly SolanaChain[];
  cluster?: SolanaCluster;
}

export interface AdaptSolanaIosWalletOptions {
  appIdentity?: SolanaIosWalletAppIdentity;
  redirectUrl?: string;
  chain?: SolanaChain;
  cluster?: SolanaCluster;
  onChange?: () => void;
}

interface IosWalletDefinition {
  id: string;
  name: string;
  icon: string;
  appUrl: string;
  installUrl: string;
  encryptionPublicKeyParam: string;
  connectUrl: string;
  signTransactionUrl?: string;
  signAllTransactionsUrl?: string;
  signAndSendTransactionUrl?: string;
}

function resolveTweetNaCl(): typeof naclModule {
  const moduleDefault = (naclModule as typeof naclModule & { default?: typeof naclModule }).default;
  const globalNacl = (globalThis as typeof globalThis & { nacl?: typeof naclModule }).nacl;

  return ("box" in naclModule ? naclModule : (moduleDefault ?? globalNacl)) as typeof naclModule;
}

interface PendingIosWalletRequest {
  id: string;
  walletId: string;
  method: IosWalletMethod;
  dappEncryptionPublicKey: string;
  dappEncryptionSecretKey: string;
  redirectUrl: string;
  createdAt: number;
}

interface IosWalletSession {
  walletId: string;
  publicKey: string;
  session: string;
  dappEncryptionPublicKey: string;
  dappEncryptionSecretKey: string;
  walletEncryptionPublicKey: string;
  sharedSecret: string;
}

type IosWalletMethod =
  | "connect"
  | "signTransaction"
  | "signAllTransactions"
  | "signAndSendTransaction";

const DEFAULT_IOS_WALLET_CHAINS: readonly SolanaChain[] = ["solana:mainnet", "solana:devnet"];
const PENDING_REQUEST_KEY = "vue-solana:ios-wallet:pending";
const PENDING_REQUEST_TTL_MS = 10 * 60 * 1000;
const SESSION_PREFIX = "vue-solana:ios-wallet:session:";
const CALLBACK_PARAMS = new Set([
  "data",
  "nonce",
  "errorCode",
  "errorMessage",
  "phantom_encryption_public_key",
  "solflare_encryption_public_key",
  "wallet_encryption_public_key",
]);

const IOS_WALLETS: readonly IosWalletDefinition[] = [
  {
    id: "phantom",
    name: "Phantom",
    icon: "https://phantom.app/img/phantom-logo.svg",
    appUrl: "https://phantom.app",
    installUrl: "https://phantom.app/download",
    encryptionPublicKeyParam: "phantom_encryption_public_key",
    connectUrl: "https://phantom.app/ul/v1/connect",
    signTransactionUrl: "https://phantom.app/ul/v1/signTransaction",
    signAllTransactionsUrl: "https://phantom.app/ul/v1/signAllTransactions",
  },
  {
    id: "solflare",
    name: "Solflare",
    icon: "https://solflare.com/favicon.ico",
    appUrl: "https://solflare.com",
    installUrl: "https://solflare.com/download",
    encryptionPublicKeyParam: "solflare_encryption_public_key",
    connectUrl: "https://solflare.com/ul/v1/connect",
    signTransactionUrl: "https://solflare.com/ul/v1/signTransaction",
    signAllTransactionsUrl: "https://solflare.com/ul/v1/signAllTransactions",
    signAndSendTransactionUrl: "https://solflare.com/ul/v1/signAndSendTransaction",
  },
  {
    id: "backpack",
    name: "Backpack",
    icon: "https://backpack.app/favicon.ico",
    appUrl: "https://backpack.app",
    installUrl: "https://backpack.app/download",
    encryptionPublicKeyParam: "wallet_encryption_public_key",
    connectUrl: "https://backpack.app/ul/v1/connect",
    signTransactionUrl: "https://backpack.app/ul/v1/signTransaction",
    signAllTransactionsUrl: "https://backpack.app/ul/v1/signAllTransactions",
    signAndSendTransactionUrl: "https://backpack.app/ul/v1/signAndSendTransaction",
  },
];

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

export function handleSolanaIosWalletCallback(options: { clearUrl?: boolean } = {}): {
  walletId: string;
  method: IosWalletMethod;
  publicKey?: string;
  signature?: string;
  transaction?: Uint8Array;
  transactions?: Uint8Array[];
} | null {
  if (typeof window === "undefined") {
    return null;
  }

  const url = new URL(window.location.href);

  if (!hasIosWalletCallbackParams(url)) {
    return null;
  }

  const errorCode = url.searchParams.get("errorCode");
  const errorMessage = url.searchParams.get("errorMessage");

  if (errorCode || errorMessage) {
    clearPendingRequest();
    cleanCallbackUrl(url, options.clearUrl);
    throw new Error(errorMessage || `iOS wallet request failed: ${errorCode}`);
  }

  const pending = getPendingRequest();

  if (!pending) {
    cleanCallbackUrl(url, options.clearUrl);
    throw new Error("Received an iOS wallet callback without a pending request");
  }

  if (isPendingRequestExpired(pending)) {
    clearPendingRequest();
    cleanCallbackUrl(url, options.clearUrl);
    throw new Error("Received an expired iOS wallet callback");
  }

  const definition = getIosWalletDefinitionById(pending.walletId);
  const walletEncryptionPublicKey = url.searchParams.get(definition.encryptionPublicKeyParam);
  const nonce = url.searchParams.get("nonce");
  const data = url.searchParams.get("data");

  if (!nonce || !data) {
    clearPendingRequest();
    cleanCallbackUrl(url, options.clearUrl);
    throw new Error("Received an incomplete iOS wallet callback");
  }

  try {
    const sharedSecret = getSharedSecret(
      walletEncryptionPublicKey ?? getStoredSession(pending.walletId)?.walletEncryptionPublicKey,
      pending.dappEncryptionSecretKey,
    );
    const payload = decryptPayload(data, nonce, sharedSecret);
    const result = createCallbackResult(pending, payload);

    if (pending.method === "connect") {
      if (!walletEncryptionPublicKey) {
        throw new Error("iOS wallet connect callback did not include an encryption public key");
      }

      const publicKey = getPublicKeyField(payload, "public_key");

      storeSession({
        walletId: pending.walletId,
        publicKey,
        session: getStringField(payload, "session"),
        dappEncryptionPublicKey: pending.dappEncryptionPublicKey,
        dappEncryptionSecretKey: pending.dappEncryptionSecretKey,
        walletEncryptionPublicKey,
        sharedSecret: bs58.encode(sharedSecret),
      });
    }

    clearPendingRequest();
    cleanCallbackUrl(url, options.clearUrl);

    return result;
  } catch (cause) {
    clearPendingRequest();
    cleanCallbackUrl(url, options.clearUrl);
    throw cause;
  }
}

export function isSolanaIosWalletInfo(walletInfo: SolanaWalletInfo): boolean {
  return walletInfo.source === "deep-link" && isIosWalletDefinition(walletInfo.wallet);
}

export function isSolanaIosBrowserWalletSupported(): boolean {
  return isIosBrowser();
}

export function isIosBrowser(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  const maxTouchPoints = navigator.maxTouchPoints ?? 0;

  return /iPad|iPhone|iPod/i.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
}

export function getDefaultIosWalletAppIdentity(): SolanaIosWalletAppIdentity {
  if (typeof window === "undefined") {
    return {
      name: "Vue Solana App",
      uri: "https://localhost",
    };
  }

  return {
    name: document.title || "Vue Solana App",
    uri: window.location.origin,
    icon: getDocumentIconUrl(),
  };
}

export function getDefaultIosWalletRedirectUrl(): string {
  if (typeof window === "undefined") {
    return "https://localhost";
  }

  const url = new URL(window.location.href);

  for (const param of CALLBACK_PARAMS) {
    url.searchParams.delete(param);
  }

  return url.toString();
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
  method: Exclude<IosWalletMethod, "connect">,
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

function createPendingRequest(
  walletId: string,
  method: IosWalletMethod,
  keyPair: nacl.BoxKeyPair,
  redirectUrl?: string,
): PendingIosWalletRequest {
  return {
    id: createRequestId(),
    walletId,
    method,
    dappEncryptionPublicKey: bs58.encode(keyPair.publicKey),
    dappEncryptionSecretKey: bs58.encode(keyPair.secretKey),
    redirectUrl: redirectUrl ?? getDefaultIosWalletRedirectUrl(),
    createdAt: Date.now(),
  };
}

function createCallbackResult(pending: PendingIosWalletRequest, payload: Record<string, unknown>) {
  if (pending.method === "connect") {
    return {
      walletId: pending.walletId,
      method: pending.method,
      publicKey: getPublicKeyField(payload, "public_key"),
    };
  }

  if (pending.method === "signTransaction") {
    return {
      walletId: pending.walletId,
      method: pending.method,
      transaction: bs58.decode(getStringField(payload, "transaction")),
    };
  }

  if (pending.method === "signAllTransactions") {
    const transactions = payload.transactions;

    if (
      !Array.isArray(transactions) ||
      transactions.some((transaction) => typeof transaction !== "string")
    ) {
      throw new Error("iOS wallet returned invalid signed transactions");
    }

    return {
      walletId: pending.walletId,
      method: pending.method,
      transactions: transactions.map((transaction) => bs58.decode(transaction as string)),
    };
  }

  return {
    walletId: pending.walletId,
    method: pending.method,
    signature: getStringField(payload, "signature"),
  };
}

function getIosWalletMethodUrl(
  definition: IosWalletDefinition,
  method: Exclude<IosWalletMethod, "connect">,
) {
  const url = definition[`${method}Url`];

  if (!url) {
    throw new Error(`${definition.name} does not support ${method} through iOS deeplinks`);
  }

  return url;
}

function getSharedSecret(
  walletEncryptionPublicKey: string | null | undefined,
  dappSecretKey: string,
) {
  if (!walletEncryptionPublicKey) {
    throw new Error("Missing iOS wallet encryption public key");
  }

  return nacl.box.before(bs58.decode(walletEncryptionPublicKey), bs58.decode(dappSecretKey));
}

function encryptPayload(
  payload: Record<string, unknown>,
  nonce: Uint8Array,
  sharedSecret: Uint8Array,
) {
  return bs58.encode(nacl.box.after(encodeJson(payload), nonce, sharedSecret));
}

function decryptPayload(data: string, nonce: string, sharedSecret: Uint8Array) {
  const decrypted = nacl.box.open.after(bs58.decode(data), bs58.decode(nonce), sharedSecret);

  if (!decrypted) {
    throw new Error("Unable to decrypt iOS wallet callback");
  }

  return JSON.parse(new TextDecoder().decode(decrypted)) as Record<string, unknown>;
}

function encodeJson(value: Record<string, unknown>) {
  return new TextEncoder().encode(JSON.stringify(value));
}

function serializeTransaction(transaction: SolanaTransaction): Uint8Array {
  if (transaction instanceof Transaction) {
    return transaction.serialize({ requireAllSignatures: false, verifySignatures: false });
  }

  return transaction.serialize();
}

function deserializeTransaction(
  source: SolanaTransaction | undefined,
  bytes: Uint8Array,
): SolanaTransaction {
  if (source instanceof Transaction) {
    return Transaction.from(bytes);
  }

  return VersionedTransaction.deserialize(bytes);
}

function getStoredIosWalletAccount(walletId: string, chains: readonly string[]) {
  const session = getStoredSession(walletId);

  if (!session) {
    return [];
  }

  return [
    {
      address: session.publicKey,
      publicKey: new PublicKey(session.publicKey).toBytes(),
      chains,
    },
  ];
}

function getStoredSession(walletId: string): IosWalletSession | null {
  const value = getStorage()?.getItem(`${SESSION_PREFIX}${walletId}`);

  if (!value) {
    return null;
  }

  try {
    const session = JSON.parse(value) as IosWalletSession;

    new PublicKey(session.publicKey);

    return session;
  } catch {
    removeStoredSession(walletId);
    return null;
  }
}

function storeSession(session: IosWalletSession) {
  getStorage()?.setItem(`${SESSION_PREFIX}${session.walletId}`, JSON.stringify(session));
}

function removeStoredSession(walletId: string) {
  getStorage()?.removeItem(`${SESSION_PREFIX}${walletId}`);
}

function getPendingRequest(): PendingIosWalletRequest | null {
  const value = getStorage()?.getItem(PENDING_REQUEST_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as PendingIosWalletRequest;
  } catch {
    clearPendingRequest();
    return null;
  }
}

function storePendingRequest(request: PendingIosWalletRequest) {
  getStorage()?.setItem(PENDING_REQUEST_KEY, JSON.stringify(request));
}

function clearPendingRequest() {
  getStorage()?.removeItem(PENDING_REQUEST_KEY);
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function openIosWalletUrl(url: string) {
  if (typeof window === "undefined") {
    throw new Error("iOS wallet links are only available in browser runtimes");
  }

  window.location.assign(url);
}

function waitForRedirect<T = never>(): Promise<T> {
  return new Promise(() => {});
}

function hasIosWalletCallbackParams(url: URL) {
  for (const param of CALLBACK_PARAMS) {
    if (url.searchParams.has(param)) {
      return true;
    }
  }

  return false;
}

function cleanCallbackUrl(url: URL, clearUrl?: boolean) {
  if (!clearUrl || typeof window === "undefined") {
    return;
  }

  for (const param of CALLBACK_PARAMS) {
    url.searchParams.delete(param);
  }

  window.history.replaceState(window.history.state, document.title, url.toString());
}

function createRequestId() {
  return bs58.encode(nacl.randomBytes(16));
}

function getStringField(payload: Record<string, unknown>, field: string) {
  const value = payload[field];

  if (typeof value !== "string" || !value) {
    throw new Error(`iOS wallet callback is missing ${field}`);
  }

  return value;
}

function getPublicKeyField(payload: Record<string, unknown>, field: string) {
  const value = getStringField(payload, field);

  try {
    new PublicKey(value);
  } catch {
    throw new Error(`iOS wallet callback returned an invalid ${field}`);
  }

  return value;
}

function isPendingRequestExpired(request: PendingIosWalletRequest) {
  return Date.now() - request.createdAt > PENDING_REQUEST_TTL_MS;
}

function getIosWalletDefinition(walletInfo: SolanaWalletInfo) {
  if (!isIosWalletDefinition(walletInfo.wallet)) {
    throw new Error("Solana wallet info is not an iOS wallet");
  }

  return walletInfo.wallet;
}

function getIosWalletDefinitionById(walletId: string) {
  const definition = IOS_WALLETS.find((wallet) => wallet.id === walletId);

  if (!definition) {
    throw new Error(`Unknown iOS wallet: ${walletId}`);
  }

  return definition;
}

function isIosWalletDefinition(value: unknown): value is IosWalletDefinition {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    IOS_WALLETS.some((wallet) => wallet.id === value.id)
  );
}

function getDocumentIconUrl(): string | undefined {
  const icon = document.querySelector<HTMLLinkElement>(
    'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]',
  );

  return icon?.href;
}
