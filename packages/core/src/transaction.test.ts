import { afterEach, describe, expect, it, vi } from "vitest";
import type { Connection } from "@solana/web3-compat";
import { SolanaError } from "./errors";
import type { SolanaTransaction, SolanaWallet } from "./types";
import { confirmTransactionSignature, signAndSendTransaction } from "./transaction";

const publicKey = { toBase58: () => "public-key" } as SolanaWallet["publicKey"];

afterEach(() => {
  vi.useRealTimers();
});

function createRawTransactionScenario() {
  const rawTransaction = new Uint8Array([1, 2, 3]);
  const signedTransaction = {
    serialize: vi.fn(() => rawTransaction),
  } as unknown as SolanaTransaction;
  const connection = {
    sendRawTransaction: vi.fn().mockResolvedValue("raw-signature"),
  } as unknown as Connection;
  const transaction = {} as SolanaTransaction;
  const options = { skipPreflight: true };

  return { connection, options, rawTransaction, signedTransaction, transaction };
}

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
    const { connection, options, rawTransaction, signedTransaction, transaction } =
      createRawTransactionScenario();
    const wallet = {
      connected: true,
      publicKey,
      source: "mobile-wallet-adapter",
      signTransaction: vi.fn().mockResolvedValue(signedTransaction),
      signAndSendTransaction: vi.fn().mockResolvedValue({ signature: "wallet-signature" }),
    } as unknown as SolanaWallet;

    await expect(signAndSendTransaction(connection, wallet, transaction, options)).resolves.toBe(
      "raw-signature",
    );
    expect(wallet.signTransaction).toHaveBeenCalledWith(transaction);
    expect(wallet.signAndSendTransaction).not.toHaveBeenCalled();
    expect(connection.sendRawTransaction).toHaveBeenCalledWith(rawTransaction, options);
  });

  it("signs and sends a raw transaction when the wallet cannot send directly", async () => {
    const { connection, options, rawTransaction, signedTransaction, transaction } =
      createRawTransactionScenario();
    const wallet = {
      connected: true,
      publicKey,
      signTransaction: vi.fn().mockResolvedValue(signedTransaction),
    } as unknown as SolanaWallet;

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

describe("confirmTransactionSignature", () => {
  it("confirms a signature with confirmed commitment by default", async () => {
    const result = { value: { err: null } };
    const connection = {
      confirmTransaction: vi.fn().mockResolvedValue(result),
    } as unknown as Connection;

    await expect(confirmTransactionSignature(connection, "signature")).resolves.toEqual({
      signature: "signature",
      commitment: "confirmed",
      result,
    });
    expect(connection.confirmTransaction).toHaveBeenCalledWith("signature", "confirmed");
  });

  it("supports caller-selected commitment", async () => {
    const connection = {
      confirmTransaction: vi.fn().mockResolvedValue({ value: { err: null } }),
    } as unknown as Connection;

    await expect(
      confirmTransactionSignature(connection, "signature", { commitment: "finalized" }),
    ).resolves.toMatchObject({ commitment: "finalized" });
    expect(connection.confirmTransaction).toHaveBeenCalledWith("signature", "finalized");
  });

  it("rejects when the confirmation result contains an error", async () => {
    const connection = {
      confirmTransaction: vi.fn().mockResolvedValue({
        value: { err: { InstructionError: [0, "Custom"] } },
      }),
    } as unknown as Connection;

    await expect(confirmTransactionSignature(connection, "signature")).rejects.toThrow(
      "Transaction signature failed to reach confirmed commitment.",
    );

    try {
      await confirmTransactionSignature(connection, "signature");
    } catch (error) {
      expect(error).toBeInstanceOf(SolanaError);
      expect((error as SolanaError).code).toBe("RPC_FAILURE");
      expect((error as SolanaError).cause).toEqual({ InstructionError: [0, "Custom"] });
    }
  });

  it("rejects with a clear timeout message", async () => {
    vi.useFakeTimers();
    const connection = {
      confirmTransaction: vi.fn(() => new Promise(() => undefined)),
    } as unknown as Connection;
    const promise = confirmTransactionSignature(connection, "signature", { timeoutMs: 10 });
    const rejection = promise.then(
      () => {
        throw new Error("Expected confirmation to time out.");
      },
      (error: unknown) => {
        expect(error).toBeInstanceOf(SolanaError);
        expect((error as SolanaError).message).toBe(
          "Timed out waiting for transaction signature to reach confirmed commitment.",
        );
      },
    );

    await vi.advanceTimersByTimeAsync(10);
    await rejection;

    const nextPromise = confirmTransactionSignature(connection, "signature", { timeoutMs: 10 });
    const nextRejection = nextPromise.then(
      () => {
        throw new Error("Expected confirmation to time out.");
      },
      (error: unknown) => {
        expect(error).toMatchObject({
          code: "TRANSACTION_TIMEOUT",
        });
      },
    );

    await vi.advanceTimersByTimeAsync(10);
    await nextRejection;
  });
});
