import { describe, expect, it } from "vitest";
import { getIosWalletDefinitionById, IOS_WALLETS, isIosWalletDefinition } from "./definitions";

describe("iOS wallet definitions", () => {
  it("contains the supported iOS wallets in stable order", () => {
    expect(
      IOS_WALLETS.map((wallet) => ({
        id: wallet.id,
        name: wallet.name,
        encryptionPublicKeyParam: wallet.encryptionPublicKeyParam,
        canSignTransaction: Boolean(wallet.signTransactionUrl),
        canSignAllTransactions: Boolean(wallet.signAllTransactionsUrl),
        canSignAndSendTransaction: Boolean(wallet.signAndSendTransactionUrl),
      })),
    ).toEqual([
      {
        id: "phantom",
        name: "Phantom",
        encryptionPublicKeyParam: "phantom_encryption_public_key",
        canSignTransaction: true,
        canSignAllTransactions: true,
        canSignAndSendTransaction: false,
      },
      {
        id: "solflare",
        name: "Solflare",
        encryptionPublicKeyParam: "solflare_encryption_public_key",
        canSignTransaction: true,
        canSignAllTransactions: true,
        canSignAndSendTransaction: true,
      },
      {
        id: "backpack",
        name: "Backpack",
        encryptionPublicKeyParam: "wallet_encryption_public_key",
        canSignTransaction: true,
        canSignAllTransactions: true,
        canSignAndSendTransaction: true,
      },
    ]);
  });

  it("gets wallet definitions by id", () => {
    expect(getIosWalletDefinitionById("phantom")).toBe(IOS_WALLETS[0]);
    expect(getIosWalletDefinitionById("solflare")).toBe(IOS_WALLETS[1]);
    expect(getIosWalletDefinitionById("backpack")).toBe(IOS_WALLETS[2]);
  });

  it("throws for unknown wallet ids", () => {
    expect(() => getIosWalletDefinitionById("unknown")).toThrow("Unknown iOS wallet: unknown");
  });

  it("identifies registered iOS wallet definitions", () => {
    expect(IOS_WALLETS.every(isIosWalletDefinition)).toBe(true);
    expect(isIosWalletDefinition(null)).toBe(false);
    expect(isIosWalletDefinition("phantom")).toBe(false);
    expect(isIosWalletDefinition({})).toBe(false);
    expect(isIosWalletDefinition({ id: "unknown" })).toBe(false);
  });
});
