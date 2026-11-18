import { afterEach, describe, expect, it, vi } from "vitest";
import { SolanaError } from "./errors";
import type { Signature } from "@solana/kit";
import type { SolanaClient } from "./kit";
import type { SendTransactionOptions, SimulateTransactionOptions, SolanaWallet } from "./types";
import {
  confirmTransactionSignature,
  signAndSendTransaction,
  simulateTransaction,
} from "./transaction";

vi.mock("@solana/kit", () => ({
  getTransactionDecoder: () => ({
    decode: (bytes: Uint8Array) => {
      if (bytes[0] === 255) {
        throw new Error("malformed transaction");
      }

      return { bytes };
    },
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
    expect(client.rpc.getSignatureStatuses).toHaveBeenCalledWith(
      [SIGNATURE],
      expect.objectContaining({ searchTransactionHistory: false }),
    );
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
      expect((error as SolanaError).code).toBe("TRANSACTION_FAILED");
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

  it("rejects TRANSACTION_NOT_FOUND when the signature never appears", async () => {
    vi.useFakeTimers();
    const client = createRpcClient();
    client.rpc.getSignatureStatuses.mockReturnValue({
      send: vi.fn().mockResolvedValue({ value: [null] }),
    });
    const promise = confirmTransactionSignature(client, SIGNATURE, {
      timeoutMs: 10,
      pollIntervalMs: 5,
    });
    const rejection = promise.then(
      () => {
        throw new Error("Expected confirmation to report not-found.");
      },
      (error: unknown) => {
        expect(error).toBeInstanceOf(SolanaError);
        expect((error as SolanaError).code).toBe("TRANSACTION_NOT_FOUND");
      },
    );

    await vi.runAllTimersAsync();
    await rejection;
  });

  it("rejects TRANSACTION_FAILED when the transaction errored", async () => {
    const client = createRpcClient();
    const instructionError = { InstructionError: [0, "Custom"] };
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

    try {
      await confirmTransactionSignature(client, SIGNATURE);
      throw new Error("Expected confirmation to reject.");
    } catch (error) {
      expect(error).toBeInstanceOf(SolanaError);
      expect((error as SolanaError).code).toBe("TRANSACTION_FAILED");
      expect((error as SolanaError).cause).toEqual(instructionError);
    }
  });

  it("passes abortSignal and searchTransactionHistory through to the RPC", async () => {
    const client = createRpcClient();
    const send = vi.fn().mockResolvedValue({
      value: [
        {
          slot: 10n,
          confirmations: null,
          err: null,
          confirmationStatus: "finalized",
        },
      ],
    });
    client.rpc.getSignatureStatuses.mockReturnValue({ send });
    const controller = new AbortController();

    await confirmTransactionSignature(client, SIGNATURE, {
      commitment: "finalized",
      abortSignal: controller.signal,
      searchTransactionHistory: true,
    });

    expect(client.rpc.getSignatureStatuses).toHaveBeenCalledWith([SIGNATURE], {
      searchTransactionHistory: true,
    });
    expect(send).toHaveBeenCalledWith({ abortSignal: controller.signal });
  });

  it("rejects with the abort reason when the caller aborts mid-poll", async () => {
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
    const controller = new AbortController();
    const promise = confirmTransactionSignature(client, SIGNATURE, {
      timeoutMs: 60_000,
      abortSignal: controller.signal,
    });
    const rejection = expect(promise).rejects.toMatchObject({ name: "AbortError" });

    controller.abort();
    await vi.runAllTimersAsync();
    await rejection;
  });

  it("rejects with the caller-supplied abort reason", async () => {
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
    const controller = new AbortController();
    const reason = new Error("stop");
    const promise = confirmTransactionSignature(client, SIGNATURE, {
      timeoutMs: 60_000,
      abortSignal: controller.signal,
    });
    const rejection = expect(promise).rejects.toBe(reason);

    controller.abort(reason);
    await vi.runAllTimersAsync();
    await rejection;
  });

  it("throws INVALID_INPUT for invalid timeout and poll interval values", async () => {
    const client = createRpcClient();

    await expect(
      confirmTransactionSignature(client, SIGNATURE, { timeoutMs: Number.NaN }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(
      confirmTransactionSignature(client, SIGNATURE, { pollIntervalMs: -1 }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(
      confirmTransactionSignature(client, SIGNATURE, { pollIntervalMs: 0 }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(client.rpc.getSignatureStatuses).not.toHaveBeenCalled();
  });
});

function createSimulationClient(value: unknown = {}) {
  const send = vi.fn().mockResolvedValue({ value });

  return {
    rpc: {
      simulateTransaction: vi.fn(() => ({ send })),
    },
    rpcSubscriptions: {},
  } as unknown as SolanaClient & {
    rpc: { simulateTransaction: ReturnType<typeof vi.fn> };
  };
}

describe("simulateTransaction", () => {
  it("encodes raw bytes and forwards simulation options", async () => {
    const client = createSimulationClient();
    const controller = new AbortController();
    const options: SimulateTransactionOptions = {
      commitment: "finalized",
      minContextSlot: 42n,
      sigVerify: true,
      abortSignal: controller.signal,
    };

    await simulateTransaction(client, new Uint8Array([7]), options);

    expect(client.rpc.simulateTransaction).toHaveBeenCalledWith("base64:7", {
      encoding: "base64",
      commitment: "finalized",
      minContextSlot: 42n,
      sigVerify: true,
    });
    expect(client.rpc.simulateTransaction.mock.results[0]?.value.send).toHaveBeenCalledWith({
      abortSignal: controller.signal,
    });
  });

  it("forwards replaceRecentBlockhash when requested", async () => {
    const client = createSimulationClient();

    await simulateTransaction(client, new Uint8Array([8]), {
      replaceRecentBlockhash: true,
    });

    expect(client.rpc.simulateTransaction).toHaveBeenCalledWith("base64:8", {
      encoding: "base64",
      commitment: undefined,
      minContextSlot: undefined,
      replaceRecentBlockhash: true,
    });
  });

  it("normalizes fees, logs, balances, loaded addresses, and return data", async () => {
    const mint = "mint-address";
    const owner = "owner-address";
    const programId = "program-address";
    const beforeAmount = {
      amount: "100",
      decimals: 2,
      uiAmount: 1,
      uiAmountString: "1",
    };
    const afterAmount = {
      amount: "150",
      decimals: 2,
      uiAmount: 1.5,
      uiAmountString: "1.5",
    };
    const newAmount = {
      amount: "50",
      decimals: 2,
      uiAmount: 0.5,
      uiAmountString: "0.5",
    };
    const client = createSimulationClient({
      err: null,
      fee: 5000n,
      loadedAccountsDataSize: 100,
      loadedAddresses: { readonly: ["readonly-address"], writable: ["writable-address"] },
      logs: ["Program invoke [1]", "Program success"],
      postBalances: [90n, 60n],
      postTokenBalances: [
        { accountIndex: 1, mint, owner, programId, uiTokenAmount: afterAmount },
        { accountIndex: 2, mint, owner, programId, uiTokenAmount: newAmount },
      ],
      preBalances: [100n, 50n],
      preTokenBalances: [{ accountIndex: 1, mint, owner, programId, uiTokenAmount: beforeAmount }],
      replacementBlockhash: { blockhash: "blockhash", lastValidBlockHeight: 9n },
      returnData: { data: "return-data", programId },
      unitsConsumed: 120n,
    });

    await expect(simulateTransaction(client, new Uint8Array([1]))).resolves.toEqual({
      err: null,
      logs: ["Program invoke [1]", "Program success"],
      fee: 5000n,
      balanceChanges: [
        { accountIndex: 0, before: 100n, after: 90n, change: -10n },
        { accountIndex: 1, before: 50n, after: 60n, change: 10n },
      ],
      preBalances: [100n, 50n],
      postBalances: [90n, 60n],
      tokenBalanceChanges: [
        {
          accountIndex: 1,
          mint,
          owner,
          programId,
          before: beforeAmount,
          after: afterAmount,
          change: 50n,
        },
        {
          accountIndex: 2,
          mint,
          owner,
          programId,
          before: null,
          after: newAmount,
          change: null,
        },
      ],
      preTokenBalances: [{ accountIndex: 1, mint, owner, programId, uiTokenAmount: beforeAmount }],
      postTokenBalances: [
        { accountIndex: 1, mint, owner, programId, uiTokenAmount: afterAmount },
        { accountIndex: 2, mint, owner, programId, uiTokenAmount: newAmount },
      ],
      loadedAddresses: { readonly: ["readonly-address"], writable: ["writable-address"] },
      loadedAccountsDataSize: 100,
      returnData: { data: "return-data", programId },
      replacementBlockhash: { blockhash: "blockhash", lastValidBlockHeight: 9n },
      unitsConsumed: 120n,
    });
  });

  it("returns a simulation err as data", async () => {
    const err = { InstructionError: [0, "Custom"] };
    const client = createSimulationClient({ err, logs: ["Program failed"] });

    const result = await simulateTransaction(client, new Uint8Array([1]));

    expect(result.err).toEqual(err);
    expect(result.logs).toEqual(["Program failed"]);
  });

  it("normalizes missing RPC fields to null or empty collections", async () => {
    const client = createSimulationClient({ err: null });

    await expect(simulateTransaction(client, new Uint8Array([1]))).resolves.toEqual({
      err: null,
      logs: null,
      fee: null,
      balanceChanges: null,
      preBalances: null,
      postBalances: null,
      tokenBalanceChanges: null,
      preTokenBalances: null,
      postTokenBalances: null,
      loadedAddresses: { readonly: [], writable: [] },
      loadedAccountsDataSize: null,
      returnData: null,
      replacementBlockhash: null,
      unitsConsumed: null,
    });
  });

  it("throws INVALID_INPUT for malformed bytes and conflicting options", async () => {
    const client = createSimulationClient();

    await expect(simulateTransaction(client, new Uint8Array([255]))).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
    await expect(
      simulateTransaction(client, new Uint8Array([1]), {
        sigVerify: true,
        replaceRecentBlockhash: true,
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(client.rpc.simulateTransaction).not.toHaveBeenCalled();
  });

  it("normalizes transport failures to RPC_FAILURE", async () => {
    const failure = new Error("RPC simulation failed");
    const client = createSimulationClient();
    client.rpc.simulateTransaction.mockReturnValue({
      send: vi.fn().mockRejectedValue(failure),
    });

    try {
      await simulateTransaction(client, new Uint8Array([1]));
      throw new Error("Expected simulateTransaction to reject.");
    } catch (error) {
      expect(error).toBeInstanceOf(SolanaError);
      expect((error as SolanaError).code).toBe("RPC_FAILURE");
      expect((error as SolanaError).cause).toBe(failure);
    }
  });

  it("rejects before RPC when the caller signal is already aborted", async () => {
    const client = createSimulationClient();
    const controller = new AbortController();
    controller.abort(new Error("stop"));

    await expect(
      simulateTransaction(client, new Uint8Array([1]), { abortSignal: controller.signal }),
    ).rejects.toThrow("stop");
    expect(client.rpc.simulateTransaction).not.toHaveBeenCalled();
  });

  it("preserves the caller-supplied abort reason during RPC", async () => {
    const reason = new Error("stop");
    const controller = new AbortController();
    const client = createSimulationClient();
    client.rpc.simulateTransaction.mockReturnValue({
      send: vi.fn(
        ({ abortSignal }: { abortSignal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            abortSignal.addEventListener("abort", () => reject(abortSignal.reason), {
              once: true,
            });
          }),
      ),
    });

    const promise = simulateTransaction(client, new Uint8Array([1]), {
      abortSignal: controller.signal,
    });
    controller.abort(reason);

    await expect(promise).rejects.toBe(reason);
  });
});
