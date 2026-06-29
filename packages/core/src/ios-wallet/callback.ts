import { PublicKey } from "@solana/web3-compat";
import bs58 from "bs58";
import { cleanCallbackUrl, hasIosWalletCallbackParams } from "./browser";
import { decryptPayload, getSharedSecret } from "./crypto";
import { getIosWalletDefinitionById } from "./definitions";
import {
  clearPendingRequest,
  getPendingRequest,
  getStoredSession,
  isPendingRequestExpired,
  storeSession,
} from "./storage";
import type { IosWalletCallbackResult, PendingIosWalletRequest } from "./types";

export function handleSolanaIosWalletCallback(
  options: { clearUrl?: boolean } = {},
): IosWalletCallbackResult | null {
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

    return result;
  } finally {
    clearPendingRequest();
    cleanCallbackUrl(url, options.clearUrl);
  }
}

function createCallbackResult(
  pending: PendingIosWalletRequest,
  payload: Record<string, unknown>,
): IosWalletCallbackResult {
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

    if (
      typeof pending.requestedTransactionCount === "number" &&
      transactions.length !== pending.requestedTransactionCount
    ) {
      throw new Error(
        `iOS wallet returned ${transactions.length} signed transactions for ${pending.requestedTransactionCount} requested transactions`,
      );
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
