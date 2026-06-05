import { describe, expect, it } from "vitest";
import type { SolanaWallet } from "./types";
import { assertWalletCanSign, assertWalletConnected, isWalletConnected } from "./wallet";

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
  });

  it("throws when a connected wallet cannot sign transactions", () => {
    const wallet = { connected: true, publicKey } as SolanaWallet;

    expect(() => assertWalletCanSign(wallet)).toThrow(
      "Solana wallet does not support signTransaction",
    );
  });

  it("accepts a connected wallet that can sign transactions", () => {
    const wallet = {
      connected: true,
      publicKey,
      signTransaction: async (transaction) => transaction,
    } as SolanaWallet;

    expect(() => assertWalletCanSign(wallet)).not.toThrow();
  });
});
