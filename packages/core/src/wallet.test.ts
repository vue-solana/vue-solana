import { describe, expect, it } from "vitest";
import type { Address } from "./kit";
import type { SolanaWallet } from "./types";
import {
  assertWalletCanSign,
  assertWalletCanSignAndSendTransactions,
  assertWalletCanSignIn,
  assertWalletCanSignMessage,
  assertWalletCanSignTransactions,
  assertWalletConnected,
  createNoWalletSelectedError,
  isWalletConnected,
  SolanaWalletError,
} from "./wallet";

const publicKey = "11111111111111111111111111111111" as Address;

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
      expect((error as SolanaWalletError).code).toBe("WALLET_FEATURE_UNSUPPORTED");
      expect((error as SolanaWalletError).feature).toBe("signTransaction");
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
      expect((error as SolanaWalletError).code).toBe("WALLET_FEATURE_UNSUPPORTED");
      expect((error as SolanaWalletError).feature).toBe("signMessage");
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

  it("throws when a connected wallet cannot sign in", () => {
    const wallet = { connected: true, publicKey } as SolanaWallet;

    expect(() => assertWalletCanSignIn(wallet)).toThrow(
      "Solana wallet does not support signIn (Sign In With Solana)",
    );

    try {
      assertWalletCanSignIn(wallet);
    } catch (error) {
      expect(error).toBeInstanceOf(SolanaWalletError);
      expect((error as SolanaWalletError).code).toBe("WALLET_FEATURE_UNSUPPORTED");
      expect((error as SolanaWalletError).feature).toBe("signIn");
    }
  });

  it("accepts a connected wallet that can sign in", () => {
    const wallet = {
      connected: true,
      publicKey,
      signIn: async () => ({
        account: { address: publicKey, publicKey: new Uint8Array(), chains: ["solana:devnet"] },
        signedMessage: new Uint8Array(),
        signature: new Uint8Array(),
        signatureType: "ed25519",
      }),
    } as SolanaWallet;

    expect(() => assertWalletCanSignIn(wallet)).not.toThrow();
  });

  it("throws when a connected wallet cannot sign batches of transactions", () => {
    const wallet = { connected: true, publicKey } as SolanaWallet;

    expect(() => assertWalletCanSignTransactions(wallet)).toThrow(
      "Solana wallet does not support signTransactions",
    );

    try {
      assertWalletCanSignTransactions(wallet);
    } catch (error) {
      expect(error).toBeInstanceOf(SolanaWalletError);
      expect((error as SolanaWalletError).code).toBe("WALLET_FEATURE_UNSUPPORTED");
      expect((error as SolanaWalletError).feature).toBe("signTransactions");
    }
  });

  it("accepts a connected wallet that exposes a batch signTransactions method", () => {
    const wallet = {
      connected: true,
      publicKey,
      signTransactions: async (transactions) => transactions,
    } as SolanaWallet;

    expect(() => assertWalletCanSignTransactions(wallet)).not.toThrow();
  });

  it("accepts a connected wallet that only exposes signAllTransactions", () => {
    const wallet = {
      connected: true,
      publicKey,
      signAllTransactions: async (transactions) => transactions,
    } as SolanaWallet;

    expect(() => assertWalletCanSignTransactions(wallet)).not.toThrow();
  });

  it("throws when a connected wallet cannot sign and send batches of transactions", () => {
    const wallet = { connected: true, publicKey } as SolanaWallet;

    expect(() => assertWalletCanSignAndSendTransactions(wallet)).toThrow(
      "Solana wallet does not support signAndSendTransactions",
    );

    try {
      assertWalletCanSignAndSendTransactions(wallet);
    } catch (error) {
      expect(error).toBeInstanceOf(SolanaWalletError);
      expect((error as SolanaWalletError).code).toBe("WALLET_FEATURE_UNSUPPORTED");
      expect((error as SolanaWalletError).feature).toBe("signAndSendTransactions");
    }
  });

  it("accepts a connected wallet that exposes a batch signAndSendTransactions method", () => {
    const wallet = {
      connected: true,
      publicKey,
      connect: async () => {},
      disconnect: async () => {},
      signAndSendTransactions: async () => [],
    } as SolanaWallet;

    expect(() => assertWalletCanSignAndSendTransactions(wallet)).not.toThrow();
  });

  it("accepts a connected wallet that only exposes signAndSendTransaction", () => {
    const wallet = {
      connected: true,
      publicKey,
      connect: async () => {},
      disconnect: async () => {},
      signAndSendTransaction: async () => ({ signature: "" }),
    } as SolanaWallet;

    expect(() => assertWalletCanSignAndSendTransactions(wallet)).not.toThrow();
  });

  it("creates no-wallet-selected errors with a stable code", () => {
    const cause = new Error("missing selection");
    const error = createNoWalletSelectedError(cause);

    expect(error).toBeInstanceOf(SolanaWalletError);
    expect(error.code).toBe("NO_WALLET_SELECTED");
    expect(error.cause).toBe(cause);
  });
});
