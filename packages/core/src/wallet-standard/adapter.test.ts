import { describe, expect, it, vi } from "vitest";
import { SolanaSignMessage, SolanaSignTransaction } from "@solana/wallet-standard-features";
import { adaptSolanaStandardWallet } from "./adapter";
import type { SolanaWalletInfo } from "../types";
import {
  account,
  createStandardWallet,
  createTestTransaction,
  getConnectFeature,
  getDisconnectFeature,
} from "./test-utils.test-utils";

describe("Wallet Standard adapter", () => {
  it("adapts connect and disconnect to SolanaWallet", async () => {
    const standardWallet = createStandardWallet();
    const walletInfo = {
      name: standardWallet.name,
      icon: standardWallet.icon,
      chains: standardWallet.chains,
      accounts: [],
      wallet: standardWallet,
    } satisfies SolanaWalletInfo;
    const wallet = adaptSolanaStandardWallet(walletInfo, { chain: "solana:devnet" });

    expect(wallet.connected).toBe(false);
    expect(wallet.publicKey).toBeNull();

    await wallet.connect();

    expect(wallet.connected).toBe(true);
    expect(wallet.publicKey?.toBase58()).toBe(account.address);
    expect(getConnectFeature(standardWallet).connect).toHaveBeenCalledOnce();

    await wallet.disconnect();

    expect(wallet.connected).toBe(false);
    expect(getDisconnectFeature(standardWallet).disconnect).toHaveBeenCalledOnce();
  });

  it("copies wallet source metadata onto adapted wallets", () => {
    const standardWallet = createStandardWallet();
    const walletInfo = {
      name: standardWallet.name,
      icon: standardWallet.icon,
      chains: standardWallet.chains,
      platform: "mobile",
      source: "mobile-wallet-adapter",
      accounts: [],
      wallet: standardWallet,
    } satisfies SolanaWalletInfo;
    const wallet = adaptSolanaStandardWallet(walletInfo, { chain: "solana:devnet" });

    expect(wallet.platform).toBe("mobile");
    expect(wallet.source).toBe("mobile-wallet-adapter");
  });

  it("starts disconnected when a standard wallet already exposes accounts", async () => {
    const standardWallet = createStandardWallet([account]);
    const walletInfo = {
      name: standardWallet.name,
      icon: standardWallet.icon,
      chains: standardWallet.chains,
      accounts: [],
      wallet: standardWallet,
    } satisfies SolanaWalletInfo;
    const wallet = adaptSolanaStandardWallet(walletInfo, { chain: "solana:devnet" });

    expect(wallet.connected).toBe(false);
    expect(wallet.publicKey).toBeNull();

    standardWallet.emitAccountsChange([account]);

    expect(wallet.connected).toBe(false);
    expect(wallet.publicKey).toBeNull();

    await wallet.connect();

    expect(wallet.connected).toBe(true);
    expect(wallet.publicKey?.toBase58()).toBe(account.address);
  });

  it("notifies when wallet state changes", async () => {
    const onChange = vi.fn();
    const standardWallet = createStandardWallet();
    const walletInfo = {
      name: standardWallet.name,
      icon: standardWallet.icon,
      chains: standardWallet.chains,
      accounts: [],
      wallet: standardWallet,
    } satisfies SolanaWalletInfo;
    const wallet = adaptSolanaStandardWallet(walletInfo, { chain: "solana:devnet", onChange });

    await wallet.connect();

    expect(onChange).toHaveBeenCalledTimes(2);

    standardWallet.emitAccountsChange([account]);

    expect(onChange).toHaveBeenCalledTimes(3);

    await wallet.disconnect();

    expect(onChange).toHaveBeenCalledTimes(5);
  });

  it("keeps a deliberately disconnected wallet disconnected across account events", async () => {
    const standardWallet = createStandardWallet();
    const walletInfo = {
      name: standardWallet.name,
      icon: standardWallet.icon,
      chains: standardWallet.chains,
      accounts: [],
      wallet: standardWallet,
    } satisfies SolanaWalletInfo;
    const wallet = adaptSolanaStandardWallet(walletInfo, { chain: "solana:devnet" });

    await wallet.connect();
    await wallet.disconnect();
    standardWallet.emitAccountsChange([account]);

    expect(wallet.connected).toBe(false);
    expect(wallet.publicKey).toBeNull();
  });

  it("rejects signAllTransactions when a wallet returns fewer results than requested", async () => {
    const standardWallet = createStandardWallet();
    const signTransaction = vi.fn().mockResolvedValue([]);
    (standardWallet.features as Record<string, unknown>)[SolanaSignTransaction] = {
      version: "1.0.0",
      supportedTransactionVersions: ["legacy"],
      signTransaction,
    };
    const walletInfo = {
      name: standardWallet.name,
      icon: standardWallet.icon,
      chains: standardWallet.chains,
      accounts: [],
      wallet: standardWallet,
    } satisfies SolanaWalletInfo;
    const wallet = adaptSolanaStandardWallet(walletInfo, { chain: "solana:devnet" });

    await wallet.connect();

    await expect(
      wallet.signAllTransactions?.([createTestTransaction(), createTestTransaction()]),
    ).rejects.toThrow("Solana wallet returned 0 signed transactions for 2 requested transactions");
    expect(signTransaction).toHaveBeenCalledOnce();
  });

  it("adapts message signing when the wallet supports it", async () => {
    const standardWallet = createStandardWallet();
    const message = new Uint8Array([1, 2, 3]);
    const signedMessage = new Uint8Array([4, 5, 6]);
    const signature = new Uint8Array([7, 8, 9]);
    const signMessage = vi.fn().mockResolvedValue([{ signedMessage, signature }]);
    (standardWallet.features as Record<string, unknown>)[SolanaSignMessage] = {
      version: "1.0.0",
      signMessage,
    };
    const walletInfo = {
      name: standardWallet.name,
      icon: standardWallet.icon,
      chains: standardWallet.chains,
      accounts: [],
      wallet: standardWallet,
    } satisfies SolanaWalletInfo;
    const wallet = adaptSolanaStandardWallet(walletInfo, { chain: "solana:devnet" });

    await wallet.connect();

    await expect(wallet.signMessage?.(message)).resolves.toEqual({ signedMessage, signature });
    expect(signMessage).toHaveBeenCalledWith({ account, message });
  });

  it("rejects message signing when a wallet returns no signature result", async () => {
    const standardWallet = createStandardWallet();
    const signMessage = vi.fn().mockResolvedValue([]);
    (standardWallet.features as Record<string, unknown>)[SolanaSignMessage] = {
      version: "1.0.0",
      signMessage,
    };
    const walletInfo = {
      name: standardWallet.name,
      icon: standardWallet.icon,
      chains: standardWallet.chains,
      accounts: [],
      wallet: standardWallet,
    } satisfies SolanaWalletInfo;
    const wallet = adaptSolanaStandardWallet(walletInfo, { chain: "solana:devnet" });

    await wallet.connect();

    await expect(wallet.signMessage?.(new Uint8Array([1, 2, 3]))).rejects.toThrow(
      "Solana wallet did not return a message signature",
    );
    expect(signMessage).toHaveBeenCalledOnce();
  });

  it("omits message signing when the wallet does not support it", () => {
    const standardWallet = createStandardWallet();
    const walletInfo = {
      name: standardWallet.name,
      icon: standardWallet.icon,
      chains: standardWallet.chains,
      accounts: [],
      wallet: standardWallet,
    } satisfies SolanaWalletInfo;
    const wallet = adaptSolanaStandardWallet(walletInfo, { chain: "solana:devnet" });

    expect(wallet.signMessage).toBeUndefined();
  });
});
