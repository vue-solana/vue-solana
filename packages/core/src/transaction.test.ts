import { afterEach, describe, expect, it, vi } from "vitest";
import { SolanaError } from "./errors";
import type { Signature } from "@solana/kit";
import type { SolanaClient } from "./kit";
import type { SendTransactionOptions, SolanaWallet } from "./types";
import { confirmTransactionSignature, signAndSendTransaction } from "./transaction";

vi.mock("@solana/kit", () => ({
  getTransactionDecoder: () => ({
    decode: (bytes: Uint8Array) => ({ bytes }),
  }),
  getBase64EncodedWireTransaction: (transaction: { bytes: Uint8Array }) =>
    `base64:${transaction.bytes[0]}`,
}));

const publicKey = "11111111111111111111111111111111" as SolanaWallet["publicKey"];
const SIGNATURE = "signature" as Signature;

afterEach(() => {
  vi.useRealTimers();
});

function createRpcClient(sendResult: unknown = "raw-signature") {
  const send = vi.fn().mockResolvedValue(sendResult);

  return {
    rpc: {
      sendTransaction: vi.fn(() => ({ send })),
      getSignatureStatuses: vi.fn(),
    },
    rpcSubscriptions: {},
  } as unknown as SolanaClient & {
    rpc: {
      sendTransaction: ReturnType<typeof vi.fn>;
      getSignatureStatuses: ReturnType<typeof vi.fn>;
    };
  };
}

describe("signAndSendTransaction", () => {
  it("uses a wallet signAndSendTransaction implementation when available", async () => {
    const wallet = {
      connected: true,
      publicKey,
      signAndSendTransaction: vi.fn().mockResolvedValue({ signature: "wallet-signature" }),
    } as unknown as SolanaWallet;
    const client = createRpcClient();
    const transaction = new Uint8Array([1, 2, 3]);

    await expect(signAndSendTransaction(client, wallet, transaction)).resolves.toBe(
      "wallet-signature",
    );
    expect(wallet.signAndSendTransaction).toHaveBeenCalledWith(transaction, undefined);
    expect(client.rpc.sendTransaction).not.toHaveBeenCalled();
  });

  it("signs and sends a raw transaction when the wallet cannot send directly", async () => {
    const wallet = {
      connected: true,
      publicKey,
      signTransaction: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    } as unknown as SolanaWallet;
    const client = createRpcClient();
    const transaction = new Uint8Array([1, 2, 3]);
    const options: SendTransactionOptions = { skipPreflight: true };

    await expect(signAndSendTransaction(client, wallet, transaction, options)).resolves.toBe(
      "raw-signature",
    );
    expect(wallet.signTransaction).toHaveBeenCalledWith(transaction);
    expect(client.rpc.sendTransaction).toHaveBeenCalledWith("base64:1", {
      encoding: "base64",
      maxRetries: undefined,
      minContextSlot: undefined,
      preflightCommitment: undefined,
      skipPreflight: true,
    });
  });

  it("rejects when the wallet is disconnected", async () => {
    const wallet = { connected: false, publicKey } as SolanaWallet;
    const client = createRpcClient();

    await expect(signAndSendTransaction(client, wallet, new Uint8Array([1, 2, 3]))).rejects.toThrow(
      "Solana wallet is not connected",
    );
  });

  it("normalizes wallet signing rejections", async () => {
    const walletRejection = { code: 4001, message: "User rejected signing" };
    const wallet = {
      connected: true,
      publicKey,
      signAndSendTransaction: vi.fn().mockRejectedValue(walletRejection),
    } as unknown as SolanaWallet;
    const client = createRpcClient();

    try {
      await signAndSendTransaction(client, wallet, new Uint8Array([1, 2, 3]));
      throw new Error("Expected signAndSendTransaction to reject.");
    } catch (error) {
      expect(error).toBeInstanceOf(SolanaError);
      expect((error as SolanaError).code).toBe("USER_REJECTED");
      expect((error as SolanaError).cause).toBe(walletRejection);
    }
  });

  it("normalizes raw transaction send failures", async () => {
    const sendFailure = new Error("RPC send failed");
    const wallet = {
      connected: true,
      publicKey,
      signTransaction: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    } as unknown as SolanaWallet;
    const client = createRpcClient();
    vi.mocked(client.rpc.sendTransaction).mockReturnValue({
      send: vi.fn().mockRejectedValue(sendFailure),
    });

    try {
      await signAndSendTransaction(client, wallet, new Uint8Array([1, 2, 3]));
      throw new Error("Expected signAndSendTransaction to reject.");
    } catch (error) {
      expect(error).toBeInstanceOf(SolanaError);
      expect((error as SolanaError).code).toBe("RPC_FAILURE");
      expect((error as SolanaError).cause).toBe(sendFailure);
    }
  });
});

describe("confirmTransactionSignature", () => {
  it("confirms a signature with confirmed commitment by default", async () => {
    const client = createRpcClient();
    client.rpc.getSignatureStatuses.mockReturnValue({
      send: vi.fn().mockResolvedValue({
        value: [
          {
            slot: 10n,
            confirmations: 1n,
            err: null,
            confirmationStatus: "confirmed",
          },
        ],
      }),
    });

    await expect(confirmTransactionSignature(client, SIGNATURE)).resolves.toMatchObject({
      signature: "signature",
      commitment: "confirmed",
    });
    expect(client.rpc.getSignatureStatuses).toHaveBeenCalledWith([SIGNATURE]);
  });

  it("supports caller-selected commitment", async () => {
    const client = createRpcClient();
    client.rpc.getSignatureStatuses.mockReturnValue({
      send: vi.fn().mockResolvedValue({
        value: [
          {
            slot: 10n,
            confirmations: null,
            err: null,
            confirmationStatus: "finalized",
          },
        ],
      }),
    });

    await expect(
      confirmTransactionSignature(client, SIGNATURE, { commitment: "finalized" }),
    ).resolves.toMatchObject({ commitment: "finalized" });
  });

  it("rejects when the confirmation result contains an error", async () => {
    const instructionError = { InstructionError: [0, "Custom"] };
    const client = createRpcClient();
    client.rpc.getSignatureStatuses.mockReturnValue({
      send: vi.fn().mockResolvedValue({
        value: [
          {
            slot: 10n,
            confirmations: null,
            err: instructionError,
            confirmationStatus: "confirmed",
          },
        ],
      }),
    });

    await expect(confirmTransactionSignature(client, SIGNATURE)).rejects.toThrow(
      "Transaction signature failed to reach confirmed commitment.",
    );

    try {
      await confirmTransactionSignature(client, SIGNATURE);
    } catch (error) {
      expect(error).toBeInstanceOf(SolanaError);
      expect((error as SolanaError).code).toBe("RPC_FAILURE");
      expect((error as SolanaError).cause).toEqual(instructionError);
    }
  });

  it("rejects with a clear timeout message", async () => {
    vi.useFakeTimers();
    const client = createRpcClient();
    client.rpc.getSignatureStatuses.mockReturnValue({
      send: vi.fn().mockResolvedValue({
        value: [
          {
            slot: 10n,
            confirmations: 0n,
            err: null,
            confirmationStatus: "processed",
          },
        ],
      }),
    });
    const promise = confirmTransactionSignature(client, SIGNATURE, { timeoutMs: 10 });
    const rejection = promise.then(
      () => {
        throw new Error("Expected confirmation to time out.");
      },
      (error: unknown) => {
        expect(error).toBeInstanceOf(SolanaError);
        expect((error as SolanaError).message).toBe(
          "Timed out waiting for transaction signature to reach confirmed commitment.",
        );
        expect((error as SolanaError).code).toBe("TRANSACTION_TIMEOUT");
      },
    );

    await vi.runAllTimersAsync();
    await rejection;
  });
});
