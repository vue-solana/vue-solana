import bs58 from "bs58";
import type { SendTransactionOptions, SolanaTransaction } from "../types";
import { getDefaultIosWalletAppIdentity, openIosWalletUrl, waitForRedirect } from "./browser";
import { handleSolanaIosWalletCallback } from "./callback";
import { encryptPayload, nacl } from "./crypto";
import { createPendingRequest, getStoredSession, storePendingRequest } from "./storage";
import { serializeTransaction } from "./transactions";
import type {
  AdaptSolanaIosWalletOptions,
  IosWalletDefinition,
  IosWalletSignMethod,
} from "./types";

export function launchConnect(
  definition: IosWalletDefinition,
  options: AdaptSolanaIosWalletOptions,
) {
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

export async function launchSignTransaction(
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

export async function launchSignAllTransactions(
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

export async function launchSignAndSendTransaction(
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
