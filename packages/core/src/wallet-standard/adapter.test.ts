import { describe, expect, it, vi } from "vitest";
import {
  SolanaSignAndSendTransaction,
  SolanaSignIn,
  SolanaSignMessage,
  SolanaSignTransaction,
} from "@solana/wallet-standard-features";
import bs58 from "bs58";
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
    expect(wallet.publicKey).toBe(account.address);
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
    expect(wallet.publicKey).toBe(account.address);
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

  it("signs raw transaction bytes through the standard wallet", async () => {
    const standardWallet = createStandardWallet();
    const transaction = createTestTransaction();
    const signedTransaction = new Uint8Array([9, 9, 9]);
    const signTransaction = vi.fn().mockResolvedValue([{ signedTransaction }]);
    (standardWallet.features as Record<string, unknown>)[SolanaSignTransaction] = {
      version: "1.0.0",
      supportedTransactionVersions: ["legacy", 0],
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

    await expect(wallet.signTransaction?.(transaction)).resolves.toBe(signedTransaction);
    expect(signTransaction).toHaveBeenCalledWith({
      account,
      transaction,
      chain: "solana:devnet",
    });
  });

  it("signs multiple raw transaction bytes through the standard wallet", async () => {
    const standardWallet = createStandardWallet();
    const transactions = [createTestTransaction(), new Uint8Array([6, 7, 8])];
    const signedTransaction = new Uint8Array([9, 9, 9]);
    const signTransaction = vi
      .fn()
      .mockResolvedValue([{ signedTransaction }, { signedTransaction }]);
    (standardWallet.features as Record<string, unknown>)[SolanaSignTransaction] = {
      version: "1.0.0",
      supportedTransactionVersions: ["legacy", 0],
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

    await expect(wallet.signAllTransactions?.(transactions)).resolves.toEqual([
      signedTransaction,
      signedTransaction,
    ]);
    expect(signTransaction).toHaveBeenCalledWith(
      { account, transaction: transactions[0], chain: "solana:devnet" },
      { account, transaction: transactions[1], chain: "solana:devnet" },
    );
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

  it("rejects signAndSendTransactions when a wallet returns fewer results than requested", async () => {
    const standardWallet = createStandardWallet();
    const signAndSendTransaction = vi.fn().mockResolvedValue([]);
    (standardWallet.features as Record<string, unknown>)[SolanaSignAndSendTransaction] = {
      version: "1.0.0",
      supportedTransactionVersions: ["legacy"],
      signAndSendTransaction,
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
      wallet.signAndSendTransactions?.([createTestTransaction(), createTestTransaction()]),
    ).rejects.toThrow("Solana wallet returned 0 signatures for 2 requested transactions");
    expect(signAndSendTransaction).toHaveBeenCalledOnce();
  });

  it("rejects signAndSendTransactions when a returned entry is missing", async () => {
    const standardWallet = createStandardWallet();
    const signAndSendTransaction = vi
      .fn()
      .mockResolvedValue([{ signature: new Uint8Array([1, 2, 3]) }, undefined]);
    (standardWallet.features as Record<string, unknown>)[SolanaSignAndSendTransaction] = {
      version: "1.0.0",
      supportedTransactionVersions: ["legacy"],
      signAndSendTransaction,
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
      wallet.signAndSendTransactions?.([createTestTransaction(), createTestTransaction()]),
    ).rejects.toThrow("Solana wallet did not return a transaction signature");
  });

  it("signs and sends transactions in a single wallet request", async () => {
    const standardWallet = createStandardWallet();
    const transactions = [createTestTransaction(), new Uint8Array([6, 7, 8])];
    const signature = new Uint8Array([1, 2, 3]);
    const signAndSendTransaction = vi.fn().mockResolvedValue([{ signature }, { signature }]);
    (standardWallet.features as Record<string, unknown>)[SolanaSignAndSendTransaction] = {
      version: "1.0.0",
      supportedTransactionVersions: ["legacy"],
      signAndSendTransaction,
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

    const options = { maxRetries: 2n };
    await expect(wallet.signAndSendTransactions?.(transactions, options)).resolves.toEqual([
      bs58.encode(signature),
      bs58.encode(signature),
    ]);
    expect(signAndSendTransaction).toHaveBeenCalledWith(
      {
        account,
        transaction: transactions[0],
        chain: "solana:devnet",
        options,
      },
      {
        account,
        transaction: transactions[1],
        chain: "solana:devnet",
        options,
      },
    );
  });

  it("signs and sends through the account chain when no chain is configured", async () => {
    const standardWallet = createStandardWallet();
    const signature = new Uint8Array([1, 2, 3]);
    const signAndSendTransaction = vi.fn().mockResolvedValue([{ signature }]);
    (standardWallet.features as Record<string, unknown>)[SolanaSignAndSendTransaction] = {
      version: "1.0.0",
      supportedTransactionVersions: ["legacy"],
      signAndSendTransaction,
    };
    const walletInfo = {
      name: standardWallet.name,
      icon: standardWallet.icon,
      chains: standardWallet.chains,
      accounts: [],
      wallet: standardWallet,
    } satisfies SolanaWalletInfo;
    const wallet = adaptSolanaStandardWallet(walletInfo);

    await wallet.connect();

    await expect(wallet.signAndSendTransactions?.([createTestTransaction()])).resolves.toEqual([
      bs58.encode(signature),
    ]);
    expect(signAndSendTransaction).toHaveBeenCalledWith({
      account,
      transaction: expect.any(Uint8Array),
      chain: "solana:devnet",
      options: undefined,
    });
  });

  it("signs multiple transactions through the batch wallet request", async () => {
    const standardWallet = createStandardWallet();
    const transactions = [createTestTransaction(), new Uint8Array([6, 7, 8])];
    const signedTransaction = new Uint8Array([9, 9, 9]);
    const signTransaction = vi
      .fn()
      .mockResolvedValue([{ signedTransaction }, { signedTransaction }]);
    (standardWallet.features as Record<string, unknown>)[SolanaSignTransaction] = {
      version: "1.0.0",
      supportedTransactionVersions: ["legacy", 0],
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

    await expect(wallet.signTransactions?.(transactions)).resolves.toEqual([
      signedTransaction,
      signedTransaction,
    ]);
    expect(signTransaction).toHaveBeenCalledWith(
      { account, transaction: transactions[0], chain: "solana:devnet" },
      { account, transaction: transactions[1], chain: "solana:devnet" },
    );
  });

  it("rejects signTransactions when the wallet returns fewer results than requested", async () => {
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
      wallet.signTransactions?.([createTestTransaction(), createTestTransaction()]),
    ).rejects.toThrow("Solana wallet returned 0 signed transactions for 2 requested transactions");
    expect(signTransaction).toHaveBeenCalledOnce();
  });

  it("rejects signTransactions when a returned entry is missing", async () => {
    const standardWallet = createStandardWallet();
    const signTransaction = vi
      .fn()
      .mockResolvedValue([{ signedTransaction: new Uint8Array([9, 9, 9]) }, undefined]);
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
      wallet.signTransactions?.([createTestTransaction(), createTestTransaction()]),
    ).rejects.toThrow("Solana wallet did not return a signed transaction");
    expect(signTransaction).toHaveBeenCalledOnce();
  });

  it("adapts sign-in when the wallet supports it", async () => {
    const standardWallet = createStandardWallet();
    const signInInput = { statement: "Sign in to vue-solana" };
    const signInResult = [
      {
        account: {
          address: account.address,
          publicKey: new Uint8Array([1, 2, 3]),
          chains: ["solana:devnet"],
          label: "Test Wallet",
          icon: "data:image/png;base64,AA==",
        },
        signedMessage: new Uint8Array([4, 5, 6]),
        signature: new Uint8Array([7, 8, 9]),
        signatureType: "ed25519",
      },
    ];
    const signIn = vi.fn().mockResolvedValue(signInResult);
    (standardWallet.features as Record<string, unknown>)[SolanaSignIn] = {
      version: "1.0.0",
      signIn,
    };
    const walletInfo = {
      name: standardWallet.name,
      icon: standardWallet.icon,
      chains: standardWallet.chains,
      accounts: [],
      wallet: standardWallet,
    } satisfies SolanaWalletInfo;
    const wallet = adaptSolanaStandardWallet(walletInfo);

    const result = await wallet.signIn?.(signInInput);

    expect(signIn).toHaveBeenCalledWith(signInInput);
    expect(result).toEqual({
      account: {
        address: account.address,
        publicKey: new Uint8Array([1, 2, 3]),
        chains: ["solana:devnet"],
        label: "Test Wallet",
        icon: "data:image/png;base64,AA==",
      },
      signedMessage: new Uint8Array([4, 5, 6]),
      signature: new Uint8Array([7, 8, 9]),
      signatureType: "ed25519",
    });
  });

  it("forwards no input to sign-in when called without arguments", async () => {
    const standardWallet = createStandardWallet();
    const signIn = vi.fn().mockResolvedValue([
      {
        account,
        signedMessage: new Uint8Array([4, 5, 6]),
        signature: new Uint8Array([7, 8, 9]),
        signatureType: "ed25519",
      },
    ]);
    (standardWallet.features as Record<string, unknown>)[SolanaSignIn] = {
      version: "1.0.0",
      signIn,
    };
    const walletInfo = {
      name: standardWallet.name,
      icon: standardWallet.icon,
      chains: standardWallet.chains,
      accounts: [],
      wallet: standardWallet,
    } satisfies SolanaWalletInfo;
    const wallet = adaptSolanaStandardWallet(walletInfo);

    await wallet.signIn?.();

    expect(signIn).toHaveBeenCalledWith();
  });

  it("rejects sign-in when the wallet returns no sign-in result", async () => {
    const standardWallet = createStandardWallet();
    const signIn = vi.fn().mockResolvedValue([]);
    (standardWallet.features as Record<string, unknown>)[SolanaSignIn] = {
      version: "1.0.0",
      signIn,
    };
    const walletInfo = {
      name: standardWallet.name,
      icon: standardWallet.icon,
      chains: standardWallet.chains,
      accounts: [],
      wallet: standardWallet,
    } satisfies SolanaWalletInfo;
    const wallet = adaptSolanaStandardWallet(walletInfo);

    await expect(wallet.signIn?.()).rejects.toThrow(
      "Solana wallet did not return a sign-in result",
    );
    expect(signIn).toHaveBeenCalledOnce();
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

  it("omits sign-in when the wallet does not support it", () => {
    const standardWallet = createStandardWallet();
    const walletInfo = {
      name: standardWallet.name,
      icon: standardWallet.icon,
      chains: standardWallet.chains,
      accounts: [],
      wallet: standardWallet,
    } satisfies SolanaWalletInfo;
    const wallet = adaptSolanaStandardWallet(walletInfo, { chain: "solana:devnet" });

    expect(wallet.signIn).toBeUndefined();
  });
});
