import { describe, expect, it } from "vitest";
import type { SolanaWallet } from "./types";
import {
  assertWalletCanSign,
  assertWalletCanSignMessage,
  assertWalletConnected,
  isWalletConnected,
  SolanaWalletError,
} from "./wallet";

const publicKey = { toBase58: () => "public-key" } as SolanaWallet["publicKey"];

describe("wallet helpers", () => {
  it("detects connected wallets", () => {
    expect(isWalletConnected(null)).toBe(false);
    expect(isWalletConnected({ connected: false, publicKey })).toBe(false);
    expect(isWalletConnected({ connected: true, publicKey: null })).toBe(false);
    expect(isWalletConnected({ connected: true, publicKey })).toBe(true);
  });

  it("throws when a wallet is not connected", () => {
    expect(() => assertWalletConnected(null)).toThrow("Solana wallet is not connected");
    expect(() => assertWalletConnected({ connected: false, publicKey } as SolanaWallet)).toThrow(
      "Solana wallet is not connected",
    );

    try {
      assertWalletConnected(null);
    } catch (error) {
      expect(error).toBeInstanceOf(SolanaWalletError);
      expect((error as SolanaWalletError).code).toBe("WALLET_NOT_CONNECTED");
    }
  });

  it("throws when a connected wallet cannot sign transactions", () => {
    const wallet = { connected: true, publicKey } as SolanaWallet;

    expect(() => assertWalletCanSign(wallet)).toThrow(
      "Solana wallet does not support signTransaction",
    );

    try {
      assertWalletCanSign(wallet);
    } catch (error) {
      expect(error).toBeInstanceOf(SolanaWalletError);
      expect((error as SolanaWalletError).code).toBe("WALLET_SIGN_TRANSACTION_UNSUPPORTED");
    }
  });

  it("accepts a connected wallet that can sign transactions", () => {
    const wallet = {
      connected: true,
      publicKey,
      signTransaction: async (transaction) => transaction,
    } as SolanaWallet;

    expect(() => assertWalletCanSign(wallet)).not.toThrow();
  });

  it("throws when a connected wallet cannot sign messages", () => {
    const wallet = { connected: true, publicKey } as SolanaWallet;

    expect(() => assertWalletCanSignMessage(wallet)).toThrow(
      "Solana wallet does not support signMessage",
    );

    try {
      assertWalletCanSignMessage(wallet);
    } catch (error) {
      expect(error).toBeInstanceOf(SolanaWalletError);
      expect((error as SolanaWalletError).code).toBe("WALLET_SIGN_MESSAGE_UNSUPPORTED");
    }
  });

  it("throws a connection error before checking message signing support", () => {
    const wallet = {
      connected: false,
      publicKey,
      connect: async () => {},
      disconnect: async () => {},
      signMessage: async (message) => ({ signedMessage: message, signature: new Uint8Array() }),
    } as SolanaWallet;

    expect(() => assertWalletCanSignMessage(wallet)).toThrow("Solana wallet is not connected");

    try {
      assertWalletCanSignMessage(wallet);
    } catch (error) {
      expect(error).toBeInstanceOf(SolanaWalletError);
      expect((error as SolanaWalletError).code).toBe("WALLET_NOT_CONNECTED");
    }
  });

  it("accepts a connected wallet that can sign messages", () => {
    const wallet = {
      connected: true,
      publicKey,
      signMessage: async (message) => ({ signedMessage: message, signature: new Uint8Array() }),
    } as SolanaWallet;

    expect(() => assertWalletCanSignMessage(wallet)).not.toThrow();
  });
});
