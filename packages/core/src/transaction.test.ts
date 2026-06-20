import { describe, expect, it, vi } from "vitest";
import type { Connection } from "@solana/web3-compat";
import type { SolanaTransaction, SolanaWallet } from "./types";
import { signAndSendTransaction } from "./transaction";

const publicKey = { toBase58: () => "public-key" } as SolanaWallet["publicKey"];

describe("signAndSendTransaction", () => {
  it("uses a wallet signAndSendTransaction implementation when available", async () => {
    const wallet = {
      connected: true,
      publicKey,
      signAndSendTransaction: vi.fn().mockResolvedValue({ signature: "wallet-signature" }),
    } as unknown as SolanaWallet;
    const connection = { sendRawTransaction: vi.fn() } as unknown as Connection;
    const transaction = {} as SolanaTransaction;

    await expect(signAndSendTransaction(connection, wallet, transaction)).resolves.toBe(
      "wallet-signature",
    );
    expect(wallet.signAndSendTransaction).toHaveBeenCalledWith(transaction, undefined);
    expect(connection.sendRawTransaction).not.toHaveBeenCalled();
  });

  it("prefers signing locally before sending for Mobile Wallet Adapter wallets", async () => {
    const rawTransaction = new Uint8Array([1, 2, 3]);
    const signedTransaction = {
      serialize: vi.fn(() => rawTransaction),
    } as unknown as SolanaTransaction;
    const wallet = {
      connected: true,
      publicKey,
      source: "mobile-wallet-adapter",
      signTransaction: vi.fn().mockResolvedValue(signedTransaction),
      signAndSendTransaction: vi.fn().mockResolvedValue({ signature: "wallet-signature" }),
    } as unknown as SolanaWallet;
    const connection = {
      sendRawTransaction: vi.fn().mockResolvedValue("raw-signature"),
    } as unknown as Connection;
    const transaction = {} as SolanaTransaction;
    const options = { skipPreflight: true };

    await expect(signAndSendTransaction(connection, wallet, transaction, options)).resolves.toBe(
      "raw-signature",
    );
    expect(wallet.signTransaction).toHaveBeenCalledWith(transaction);
    expect(wallet.signAndSendTransaction).not.toHaveBeenCalled();
    expect(connection.sendRawTransaction).toHaveBeenCalledWith(rawTransaction, options);
  });

  it("signs and sends a raw transaction when the wallet cannot send directly", async () => {
    const rawTransaction = new Uint8Array([1, 2, 3]);
    const signedTransaction = {
      serialize: vi.fn(() => rawTransaction),
    } as unknown as SolanaTransaction;
    const wallet = {
      connected: true,
      publicKey,
      signTransaction: vi.fn().mockResolvedValue(signedTransaction),
    } as unknown as SolanaWallet;
    const connection = {
      sendRawTransaction: vi.fn().mockResolvedValue("raw-signature"),
    } as unknown as Connection;
    const transaction = {} as SolanaTransaction;
    const options = { skipPreflight: true };

    await expect(signAndSendTransaction(connection, wallet, transaction, options)).resolves.toBe(
      "raw-signature",
    );
    expect(wallet.signTransaction).toHaveBeenCalledWith(transaction);
    expect(signedTransaction.serialize).toHaveBeenCalled();
    expect(connection.sendRawTransaction).toHaveBeenCalledWith(rawTransaction, options);
  });

  it("rejects when the wallet is disconnected", async () => {
    const wallet = { connected: false, publicKey } as SolanaWallet;
    const connection = { sendRawTransaction: vi.fn() } as unknown as Connection;

    await expect(
      signAndSendTransaction(connection, wallet, {} as SolanaTransaction),
    ).rejects.toThrow("Solana wallet is not connected");
  });
});
