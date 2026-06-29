import { PublicKey } from "@solana/web3-compat";
import bs58 from "bs58";
import { getDefaultIosWalletRedirectUrl } from "./browser";
import { createRequestId } from "./crypto";
import type { IosWalletMethod, IosWalletSession, PendingIosWalletRequest } from "./types";

const PENDING_REQUEST_KEY = "vue-solana:ios-wallet:pending";
const PENDING_REQUEST_TTL_MS = 10 * 60 * 1000;
const SESSION_PREFIX = "vue-solana:ios-wallet:session:";

export function createPendingRequest(
  walletId: string,
  method: IosWalletMethod,
  keyPair: { publicKey: Uint8Array; secretKey: Uint8Array },
  redirectUrl?: string,
  requestedTransactionCount?: number,
): PendingIosWalletRequest {
  return {
    id: createRequestId(),
    walletId,
    method,
    dappEncryptionPublicKey: bs58.encode(keyPair.publicKey),
    dappEncryptionSecretKey: bs58.encode(keyPair.secretKey),
    redirectUrl: redirectUrl ?? getDefaultIosWalletRedirectUrl(),
    createdAt: Date.now(),
    requestedTransactionCount,
  };
}

export function getStoredIosWalletAccount(walletId: string, chains: readonly string[]) {
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

export function getStoredSession(walletId: string): IosWalletSession | null {
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

export function storeSession(session: IosWalletSession) {
  getStorage()?.setItem(`${SESSION_PREFIX}${session.walletId}`, JSON.stringify(session));
}

export function removeStoredSession(walletId: string) {
  getStorage()?.removeItem(`${SESSION_PREFIX}${walletId}`);
}

export function getPendingRequest(): PendingIosWalletRequest | null {
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

export function storePendingRequest(request: PendingIosWalletRequest) {
  getStorage()?.setItem(PENDING_REQUEST_KEY, JSON.stringify(request));
}

export function clearPendingRequest() {
  getStorage()?.removeItem(PENDING_REQUEST_KEY);
}

export function isPendingRequestExpired(request: PendingIosWalletRequest) {
  return Date.now() - request.createdAt > PENDING_REQUEST_TTL_MS;
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
