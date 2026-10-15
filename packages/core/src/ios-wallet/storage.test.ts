import { getBase58Decoder } from "@solana/kit";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearPendingRequest,
  createPendingRequest,
  getPendingRequest,
  getStoredIosWalletAccount,
  getStoredSession,
  isPendingRequestExpired,
  removeStoredSession,
  storePendingRequest,
  storeSession,
} from "./storage";
import { resetIosWalletTestEnvironment } from "./test-utils";
import type { IosWalletSession, PendingIosWalletRequest } from "./types";

// `bs58.decode` and Kit's `isAddress` agree on every real input, so a stored
// address that passes the read check but fails decoding cannot be built from
// real bytes. Toggle the failure through a hoisted flag instead; `encode`
// always passes through so the other tests in this file are unaffected.
const bs58Control = vi.hoisted(() => ({ failDecode: false }));

vi.mock("@solana/kit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@solana/kit")>();
  const actualEncoderFactory = actual.getBase58Encoder;

  return {
    ...actual,
    getBase58Encoder: () => ({
      encode: (...args: Parameters<ReturnType<typeof actual.getBase58Encoder>["encode"]>) => {
        if (bs58Control.failDecode) {
          throw new Error("Non-base58 character");
        }

        return actualEncoderFactory().encode(...args);
      },
    }),
  };
});

const pendingStorageKey = "vue-solana:ios-wallet:pending";
const phantomSessionStorageKey = "vue-solana:ios-wallet:session:phantom";
const validPublicKey = "11111111111111111111111111111111";

describe("iOS wallet storage", () => {
  afterEach(() => {
    vi.useRealTimers();
    resetIosWalletTestEnvironment();
  });

  it("creates pending requests with encoded keys, redirect URL, timestamp, and transaction count", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const request = createPendingRequest(
      "phantom",
      "signAllTransactions",
      {
        publicKey: new Uint8Array([1, 2, 3]),
        secretKey: new Uint8Array([4, 5, 6]),
      },
      "https://example.com/callback",
      2,
    );

    expect(request).toMatchObject({
      walletId: "phantom",
      method: "signAllTransactions",
      dappEncryptionPublicKey: getBase58Decoder().decode(new Uint8Array([1, 2, 3])),
      dappEncryptionSecretKey: getBase58Decoder().decode(new Uint8Array([4, 5, 6])),
      redirectUrl: "https://example.com/callback",
      createdAt: Date.parse("2026-01-01T00:00:00.000Z"),
      requestedTransactionCount: 2,
    });
    expect(request.id).toEqual(expect.any(String));
  });

  it("uses the current page URL as the default pending request redirect URL without callback params", () => {
    history.replaceState(
      null,
      "",
      "/?data=encrypted&nonce=nonce&wallet_encryption_public_key=key&keep=this",
    );

    const request = createPendingRequest("phantom", "connect", {
      publicKey: new Uint8Array([1]),
      secretKey: new Uint8Array([2]),
    });

    expect(request.redirectUrl).toBe("http://localhost:3000/?keep=this");
  });

  it("stores, reads, and removes valid iOS wallet sessions", () => {
    const session = createSession();

    storeSession(session);

    expect(getStoredSession("phantom")).toEqual(session);
    expect(sessionStorage.getItem(phantomSessionStorageKey)).toBe(JSON.stringify(session));

    removeStoredSession("phantom");

    expect(getStoredSession("phantom")).toBeNull();
  });

  it("removes malformed stored sessions", () => {
    sessionStorage.setItem(phantomSessionStorageKey, "not-json");

    expect(getStoredSession("phantom")).toBeNull();
    expect(sessionStorage.getItem(phantomSessionStorageKey)).toBeNull();
  });

  it("removes stored sessions with invalid public keys", () => {
    sessionStorage.setItem(
      phantomSessionStorageKey,
      JSON.stringify(createSession({ publicKey: "not-a-public-key" })),
    );

    expect(getStoredSession("phantom")).toBeNull();
    expect(sessionStorage.getItem(phantomSessionStorageKey)).toBeNull();
  });

  it("returns stored wallet-standard accounts for valid sessions", () => {
    storeSession(createSession());

    expect(getStoredIosWalletAccount("phantom", ["solana:devnet"])).toEqual([
      {
        address: validPublicKey,
        publicKey: new Uint8Array(32),
        chains: ["solana:devnet"],
      },
    ]);
  });

  it("purges sessions whose public key fails base58 decoding instead of throwing raw", () => {
    storeSession(createSession());

    bs58Control.failDecode = true;

    try {
      expect(getStoredIosWalletAccount("phantom", ["solana:devnet"])).toEqual([]);
    } finally {
      bs58Control.failDecode = false;
    }

    expect(sessionStorage.getItem(phantomSessionStorageKey)).toBeNull();
  });

  it("returns no accounts when no session is stored", () => {
    expect(getStoredIosWalletAccount("phantom", ["solana:devnet"])).toEqual([]);
  });

  it("stores, reads, and clears pending requests", () => {
    const request = createPendingRequestValue();

    storePendingRequest(request);

    expect(getPendingRequest()).toEqual(request);
    expect(sessionStorage.getItem(pendingStorageKey)).toBe(JSON.stringify(request));

    clearPendingRequest();

    expect(getPendingRequest()).toBeNull();
  });

  it("removes malformed pending requests", () => {
    sessionStorage.setItem(pendingStorageKey, "not-json");

    expect(getPendingRequest()).toBeNull();
    expect(sessionStorage.getItem(pendingStorageKey)).toBeNull();
  });

  it("expires pending requests after ten minutes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(10 * 60 * 1000);

    expect(isPendingRequestExpired(createPendingRequestValue({ createdAt: 1 }))).toBe(false);
    expect(isPendingRequestExpired(createPendingRequestValue({ createdAt: -1 }))).toBe(true);
  });

  it("ignores storage writes and reads when window is unavailable", () => {
    vi.stubGlobal("window", undefined);

    storeSession(createSession());
    storePendingRequest(createPendingRequestValue());

    expect(getStoredSession("phantom")).toBeNull();
    expect(getPendingRequest()).toBeNull();
  });

  it("ignores storage writes and reads when sessionStorage is unavailable", () => {
    const storageUnavailableWindow = Object.create(window) as Window;
    Object.defineProperty(storageUnavailableWindow, "sessionStorage", {
      configurable: true,
      get() {
        throw new Error("storage unavailable");
      },
    });
    vi.stubGlobal("window", storageUnavailableWindow);

    storeSession(createSession());
    storePendingRequest(createPendingRequestValue());

    expect(getStoredSession("phantom")).toBeNull();
    expect(getPendingRequest()).toBeNull();
  });
});

function createSession(overrides: Partial<IosWalletSession> = {}): IosWalletSession {
  return {
    walletId: "phantom",
    publicKey: validPublicKey,
    session: "session-token",
    dappEncryptionPublicKey: "dapp-public-key",
    dappEncryptionSecretKey: "dapp-secret-key",
    walletEncryptionPublicKey: "wallet-public-key",
    sharedSecret: "shared-secret",
    ...overrides,
  };
}

function createPendingRequestValue(
  overrides: Partial<PendingIosWalletRequest> = {},
): PendingIosWalletRequest {
  return {
    id: "request-id",
    walletId: "phantom",
    method: "connect",
    dappEncryptionPublicKey: "dapp-public-key",
    dappEncryptionSecretKey: "dapp-secret-key",
    redirectUrl: "https://example.com/callback",
    createdAt: 0,
    ...overrides,
  };
}
