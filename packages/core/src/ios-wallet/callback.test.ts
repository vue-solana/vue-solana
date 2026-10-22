import { afterEach, describe, expect, it, vi } from "vitest";
import { getBase58Decoder } from "@solana/kit";
import { adaptSolanaIosWallet, getSolanaIosWallets } from "./adapter";
import { handleSolanaIosWalletCallback } from "./callback";
import {
  mockIosNavigator,
  resetIosWalletTestEnvironment,
  setEncryptedConnectCallbackUrl,
  setEncryptedSignAllTransactionsCallbackUrl,
} from "./test-utils";

describe("iOS wallet callbacks", () => {
  afterEach(resetIosWalletTestEnvironment);

  it("validates and stores iOS connect callbacks", () => {
    mockIosNavigator();
    vi.spyOn(window.location, "assign").mockImplementation(() => {});
    const [phantom] = getSolanaIosWallets({ redirectUrl: "https://example.com/callback" });
    const wallet = adaptSolanaIosWallet(phantom!, { redirectUrl: "https://example.com/callback" });

    void wallet.connect();

    setEncryptedConnectCallbackUrl({ publicKey: "11111111111111111111111111111111" });

    const result = handleSolanaIosWalletCallback({ clearUrl: true });

    expect(result).toEqual({
      walletId: "phantom",
      method: "connect",
      publicKey: "11111111111111111111111111111111",
    });
    expect(sessionStorage.getItem("vue-solana:ios-wallet:pending")).toBeNull();
    expect(sessionStorage.getItem("vue-solana:ios-wallet:session:phantom")).toContain(
      "session-token",
    );
    expect(window.location.search).toBe("");
  });

  it("rejects callbacks without pending state", () => {
    history.replaceState(null, "", "/?nonce=nonce&data=data");

    expect(() => handleSolanaIosWalletCallback()).toThrow(
      expect.objectContaining({
        code: "INVALID_INPUT",
        message: "Received an iOS wallet callback without a pending request",
      }),
    );
  });

  it("rejects wallet-reported callback errors as WALLET_FAILURE", () => {
    history.replaceState(null, "", "/?errorCode=WALLET_ERROR&errorMessage=The+wallet+failed");

    expect(() => handleSolanaIosWalletCallback()).toThrow(
      expect.objectContaining({ code: "WALLET_FAILURE", message: "The wallet failed" }),
    );
  });

  it("maps a wallet-reported user rejection to USER_REJECTED", () => {
    history.replaceState(
      null,
      "",
      "/?errorCode=USER_REJECTED&errorMessage=User+rejected+the+request",
    );

    expect(() => handleSolanaIosWalletCallback()).toThrow(
      expect.objectContaining({ code: "USER_REJECTED" }),
    );
  });

  it("rejects expired callbacks and clears pending state", () => {
    mockIosNavigator();
    vi.spyOn(window.location, "assign").mockImplementation(() => {});
    const [phantom] = getSolanaIosWallets({ redirectUrl: "https://example.com/callback" });
    const wallet = adaptSolanaIosWallet(phantom!, { redirectUrl: "https://example.com/callback" });

    void wallet.connect();

    const pending = JSON.parse(sessionStorage.getItem("vue-solana:ios-wallet:pending")!) as {
      createdAt: number;
    };
    sessionStorage.setItem(
      "vue-solana:ios-wallet:pending",
      JSON.stringify({ ...pending, createdAt: 0 }),
    );
    history.replaceState(null, "", "/?nonce=nonce&data=data");

    expect(() => handleSolanaIosWalletCallback()).toThrow(
      expect.objectContaining({
        code: "REDIRECT_TIMEOUT",
        message: "Received an expired iOS wallet callback",
      }),
    );
    expect(sessionStorage.getItem("vue-solana:ios-wallet:pending")).toBeNull();
  });

  it("rejects incomplete callbacks and clears pending state", () => {
    mockIosNavigator();
    vi.spyOn(window.location, "assign").mockImplementation(() => {});
    const [phantom] = getSolanaIosWallets({ redirectUrl: "https://example.com/callback" });
    const wallet = adaptSolanaIosWallet(phantom!, { redirectUrl: "https://example.com/callback" });

    void wallet.connect();
    history.replaceState(null, "", "/?phantom_encryption_public_key=key&nonce=nonce");

    expect(() => handleSolanaIosWalletCallback()).toThrow(
      expect.objectContaining({
        code: "INVALID_INPUT",
        message: "Received an incomplete iOS wallet callback",
      }),
    );
    expect(sessionStorage.getItem("vue-solana:ios-wallet:pending")).toBeNull();
  });

  it("rejects connect callbacks with invalid public keys and does not store a session", () => {
    mockIosNavigator();
    vi.spyOn(window.location, "assign").mockImplementation(() => {});
    const [phantom] = getSolanaIosWallets({ redirectUrl: "https://example.com/callback" });
    const wallet = adaptSolanaIosWallet(phantom!, { redirectUrl: "https://example.com/callback" });

    void wallet.connect();
    setEncryptedConnectCallbackUrl({ publicKey: "not-a-public-key" });

    expect(() => handleSolanaIosWalletCallback()).toThrow(
      expect.objectContaining({
        code: "DECRYPTION_FAILED",
        message: "iOS wallet callback returned an invalid public_key",
      }),
    );
    expect(sessionStorage.getItem("vue-solana:ios-wallet:pending")).toBeNull();
    expect(sessionStorage.getItem("vue-solana:ios-wallet:session:phantom")).toBeNull();
  });

  it.each([
    {
      requestedTransactionCount: 2,
      transactions: [getBase58Decoder().decode(new Uint8Array([1, 2, 3]))],
    },
    {
      requestedTransactionCount: 1,
      transactions: [
        getBase58Decoder().decode(new Uint8Array([1, 2, 3])),
        getBase58Decoder().decode(new Uint8Array([4, 5, 6])),
      ],
    },
  ])(
    "rejects signAllTransactions callbacks with $transactions.length signed transactions for $requestedTransactionCount requested",
    ({ requestedTransactionCount, transactions }) => {
      setEncryptedSignAllTransactionsCallbackUrl({
        requestedTransactionCount,
        transactions,
      });

      expect(() => handleSolanaIosWalletCallback()).toThrow(
        expect.objectContaining({
          code: "WALLET_FAILURE",
          message: `iOS wallet returned ${transactions.length} signed transactions for ${requestedTransactionCount} requested transactions`,
        }),
      );
      expect(sessionStorage.getItem("vue-solana:ios-wallet:pending")).toBeNull();
    },
  );
});
