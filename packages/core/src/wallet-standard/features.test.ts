import { describe, expect, it, vi } from "vitest";
import {
  SolanaSignAndSendTransaction,
  SolanaSignIn,
  SolanaSignMessage,
  SolanaSignTransaction,
} from "@solana/wallet-standard-features";
import {
  hasSignAndSendTransaction,
  hasSignIn,
  hasSignMessage,
  hasSignTransaction,
} from "./features";
import { createStandardWallet } from "./test-utils.test-utils";

describe("Wallet Standard feature guards", () => {
  it("detects wallets that support signing transactions", () => {
    const wallet = createStandardWallet();
    (wallet.features as Record<string, unknown>)[SolanaSignTransaction] = {
      version: "1.0.0",
      supportedTransactionVersions: ["legacy"],
      signTransaction: vi.fn(),
    };

    expect(hasSignTransaction(wallet)).toBe(true);
    expect(hasSignAndSendTransaction(wallet)).toBe(false);
  });

  it("detects wallets that support signing and sending transactions", () => {
    const wallet = createStandardWallet();
    (wallet.features as Record<string, unknown>)[SolanaSignAndSendTransaction] = {
      version: "1.0.0",
      supportedTransactionVersions: ["legacy"],
      signAndSendTransaction: vi.fn(),
    };

    expect(hasSignAndSendTransaction(wallet)).toBe(true);
    expect(hasSignTransaction(wallet)).toBe(false);
  });

  it("detects wallets that support signing messages", () => {
    const wallet = createStandardWallet();
    (wallet.features as Record<string, unknown>)[SolanaSignMessage] = {
      version: "1.0.0",
      signMessage: vi.fn(),
    };

    expect(hasSignMessage(wallet)).toBe(true);
    expect(hasSignTransaction(wallet)).toBe(false);
    expect(hasSignAndSendTransaction(wallet)).toBe(false);
  });

  it("detects wallets that support signing in", () => {
    const wallet = createStandardWallet();
    (wallet.features as Record<string, unknown>)[SolanaSignIn] = {
      version: "1.0.0",
      signIn: vi.fn(),
    };

    expect(hasSignIn(wallet)).toBe(true);
    expect(hasSignMessage(wallet)).toBe(false);
    expect(hasSignTransaction(wallet)).toBe(false);
  });

  it("returns false when Solana signing features are missing", () => {
    const wallet = createStandardWallet();

    expect(hasSignTransaction(wallet)).toBe(false);
    expect(hasSignAndSendTransaction(wallet)).toBe(false);
    expect(hasSignMessage(wallet)).toBe(false);
    expect(hasSignIn(wallet)).toBe(false);
  });

  it("requires a versioned feature object, not just a present key", () => {
    const wallet = createStandardWallet();
    const features = wallet.features as Record<string, unknown>;

    features[SolanaSignTransaction] = { signTransaction: vi.fn() };
    features[SolanaSignMessage] = null;
    features[SolanaSignAndSendTransaction] = "not-an-object";
    features[SolanaSignIn] = { signIn: vi.fn() };

    expect(hasSignTransaction(wallet)).toBe(false);
    expect(hasSignMessage(wallet)).toBe(false);
    expect(hasSignAndSendTransaction(wallet)).toBe(false);
    expect(hasSignIn(wallet)).toBe(false);
  });
});
