import { isAddress } from "@solana/kit";
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
      publicKey: bs58.decode(session.publicKey),
      chains,
    },
  ];
}

export function getStoredSession(walletId: string): IosWalletSession | null {
  return readJson<IosWalletSession>(`${SESSION_PREFIX}${walletId}`, (session) =>
    isAddress(session.publicKey),
  );
}

export function storeSession(session: IosWalletSession) {
  writeJson(`${SESSION_PREFIX}${session.walletId}`, session);
}

export function removeStoredSession(walletId: string) {
  removeJson(`${SESSION_PREFIX}${walletId}`);
}

export function getPendingRequest(): PendingIosWalletRequest | null {
  return readJson(PENDING_REQUEST_KEY);
}

export function storePendingRequest(request: PendingIosWalletRequest) {
  writeJson(PENDING_REQUEST_KEY, request);
}

export function clearPendingRequest() {
  removeJson(PENDING_REQUEST_KEY);
}

export function isPendingRequestExpired(request: PendingIosWalletRequest) {
  return Date.now() - request.createdAt > PENDING_REQUEST_TTL_MS;
}

/**
 * Reads one key as JSON. A missing, unparseable or `validate`-rejected value is
 * removed and reported as absent, so a corrupted entry never survives.
 */
function readJson<T>(key: string, validate?: (value: T) => boolean): T | null {
  const value = getStorage()?.getItem(key);

  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as T;

    if (validate && !validate(parsed)) {
      throw new Error("Invalid stored value");
    }

    return parsed;
  } catch {
    getStorage()?.removeItem(key);
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  getStorage()?.setItem(key, JSON.stringify(value));
}

function removeJson(key: string) {
  getStorage()?.removeItem(key);
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
