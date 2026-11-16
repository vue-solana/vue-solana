import { describe, expect, it, vi } from "vitest";
import type { SolanaWalletInfo } from "@vue-solana/core/types";
import {
  ACCOUNT,
  OTHER,
  PAYER,
  SIGNATURE_BASE58,
  createTransaction,
  createWallet,
  withWallet,
} from "./wallet-account-signers.test-utils";
import { useWalletAccountTransactionSendingSigner } from "./useWalletAccountTransactionSendingSigner";

describe("useWalletAccountTransactionSendingSigner", () => {
  it("exposes a transaction-sending signer for the account", () => {
    const signer = withWallet(createWallet(), () =>
      useWalletAccountTransactionSendingSigner(ACCOUNT, "solana:devnet"),
    );

    expect(signer.address).toBe(PAYER);
    expect(typeof signer.signAndSendTransactions).toBe("function");
  });

  it("rejects a chain that is not a Solana identifier", () => {
    expect(() =>
      withWallet(createWallet(), () =>
        useWalletAccountTransactionSendingSigner(PAYER, "solana-devnet"),
      ),
    ).toThrow(/solana/);
  });

  it("sends through the wallet and returns signature bytes", async () => {
    const wallet = createWallet({
      signAndSendTransaction: vi.fn().mockResolvedValue({ signature: SIGNATURE_BASE58 }),
    });
    const signer = withWallet(wallet, () =>
      useWalletAccountTransactionSendingSigner(PAYER, "solana:devnet"),
    );

    const signatures = await signer.signAndSendTransactions([createTransaction()]);

    expect(wallet.signAndSendTransaction).toHaveBeenCalledTimes(1);
    expect(signatures).toHaveLength(1);
    expect(signatures[0]).toBeInstanceOf(Uint8Array);
    expect(signatures[0]).toEqual(new Uint8Array(64));
  });

  it("falls back to one singular request per transaction", async () => {
    const wallet = createWallet({
      signAndSendTransaction: vi
        .fn()
        .mockResolvedValueOnce({ signature: SIGNATURE_BASE58 })
        .mockResolvedValueOnce({ signature: SIGNATURE_BASE58 }),
    });
    const signer = withWallet(wallet, () =>
      useWalletAccountTransactionSendingSigner(PAYER, "solana:devnet"),
    );

    const signatures = await signer.signAndSendTransactions([
      createTransaction(),
      createTransaction(),
    ]);

    expect(wallet.signAndSendTransaction).toHaveBeenCalledTimes(2);
    expect(signatures).toHaveLength(2);
  });

  it("prefers the wallet batch request when the wallet supports it", async () => {
    const wallet = createWallet({
      signAndSendTransaction: vi.fn(),
      signAndSendTransactions: vi.fn().mockResolvedValue([SIGNATURE_BASE58, SIGNATURE_BASE58]),
    });
    const signer = withWallet(wallet, () =>
      useWalletAccountTransactionSendingSigner(PAYER, "solana:devnet"),
    );

    const signatures = await signer.signAndSendTransactions([
      createTransaction(),
      createTransaction(),
    ]);

    expect(wallet.signAndSendTransactions).toHaveBeenCalledTimes(1);
    expect(wallet.signAndSendTransaction).not.toHaveBeenCalled();
    expect(signatures).toHaveLength(2);
  });

  it("uses the batch request for a single transaction when that is all the wallet exposes", async () => {
    const wallet = createWallet({
      signAndSendTransactions: vi.fn().mockResolvedValue([SIGNATURE_BASE58]),
    });
    const signer = withWallet(wallet, () =>
      useWalletAccountTransactionSendingSigner(PAYER, "solana:devnet"),
    );

    const signatures = await signer.signAndSendTransactions([createTransaction()]);

    expect(wallet.signAndSendTransactions).toHaveBeenCalledTimes(1);
    expect(signatures).toHaveLength(1);
  });

  it("rejects a wallet that can neither sign and send nor batch sign and send", async () => {
    const signer = withWallet(createWallet(), () =>
      useWalletAccountTransactionSendingSigner(PAYER, "solana:devnet"),
    );

    await expect(signer.signAndSendTransactions([createTransaction()])).rejects.toMatchObject({
      code: "WALLET_FEATURE_UNSUPPORTED",
    });
  });

  it("prefers the singular request for one transaction when both capabilities exist", async () => {
    const wallet = createWallet({
      signAndSendTransaction: vi.fn().mockResolvedValue({ signature: SIGNATURE_BASE58 }),
      signAndSendTransactions: vi.fn().mockResolvedValue([SIGNATURE_BASE58]),
    });
    const signer = withWallet(wallet, () =>
      useWalletAccountTransactionSendingSigner(PAYER, "solana:devnet"),
    );

    await signer.signAndSendTransactions([createTransaction()]);

    expect(wallet.signAndSendTransaction).toHaveBeenCalledTimes(1);
    expect(wallet.signAndSendTransactions).not.toHaveBeenCalled();
  });

  it("reports a PartialSignAndSendError when the singular fallback fails after a signature landed", async () => {
    const wallet = createWallet({
      signAndSendTransaction: vi
        .fn()
        .mockResolvedValueOnce({ signature: SIGNATURE_BASE58 })
        .mockRejectedValueOnce(new Error("wallet closed")),
    });
    const signer = withWallet(wallet, () =>
      useWalletAccountTransactionSendingSigner(PAYER, "solana:devnet"),
    );

    const error = await signer
      .signAndSendTransactions([createTransaction(), createTransaction()])
      .catch((cause) => cause);

    expect(error.name).toBe("PartialSignAndSendError");
    expect(error).toMatchObject({
      code: "RPC_FAILURE",
      signatures: [SIGNATURE_BASE58],
    });
    expect(error.cause).toMatchObject({ message: "wallet closed" });
  });

  it("fails fast with a pre-aborted signal without contacting the wallet", async () => {
    const wallet = createWallet({
      signAndSendTransaction: vi.fn().mockResolvedValue({ signature: SIGNATURE_BASE58 }),
    });
    const signer = withWallet(wallet, () =>
      useWalletAccountTransactionSendingSigner(PAYER, "solana:devnet"),
    );
    const controller = new AbortController();
    controller.abort(new Error("stopped"));

    await expect(
      signer.signAndSendTransactions([createTransaction()], { abortSignal: controller.signal }),
    ).rejects.toMatchObject({ name: "Error", message: "stopped" });
    expect(wallet.signAndSendTransaction).not.toHaveBeenCalled();
  });

  it("fails fast when no wallet is selected", async () => {
    const signer = withWallet(null, () =>
      useWalletAccountTransactionSendingSigner(PAYER, "solana:devnet"),
    );

    await expect(signer.signAndSendTransactions([createTransaction()])).rejects.toMatchObject({
      code: "NO_WALLET_SELECTED",
    });
  });

  it("rejects a disconnected wallet", async () => {
    const wallet = createWallet({ connected: false, signAndSendTransaction: vi.fn() });
    const signer = withWallet(wallet, () =>
      useWalletAccountTransactionSendingSigner(PAYER, "solana:devnet"),
    );

    await expect(signer.signAndSendTransactions([createTransaction()])).rejects.toMatchObject({
      code: "WALLET_NOT_CONNECTED",
    });
    expect(wallet.signAndSendTransaction).not.toHaveBeenCalled();
  });

  it("rejects when the signer account is not the connected account", async () => {
    const wallet = createWallet({ signAndSendTransaction: vi.fn() });
    const signer = withWallet(wallet, () =>
      useWalletAccountTransactionSendingSigner(OTHER, "solana:devnet"),
    );

    await expect(signer.signAndSendTransactions([createTransaction()])).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
    expect(wallet.signAndSendTransaction).not.toHaveBeenCalled();
  });

  it("rejects when the account object does not support the requested chain", async () => {
    const account: SolanaWalletInfo["accounts"][number] = {
      ...ACCOUNT,
      chains: ["solana:mainnet"],
    };
    const signer = withWallet(createWallet(), () =>
      useWalletAccountTransactionSendingSigner(account, "solana:devnet"),
    );

    await expect(signer.signAndSendTransactions([createTransaction()])).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
  });

  it("forwards minContextSlot to the wallet", async () => {
    const wallet = createWallet({
      signAndSendTransaction: vi.fn().mockResolvedValue({ signature: SIGNATURE_BASE58 }),
    });
    const signer = withWallet(wallet, () =>
      useWalletAccountTransactionSendingSigner(PAYER, "solana:devnet"),
    );

    await signer.signAndSendTransactions([createTransaction()], { minContextSlot: 42n as never });

    expect(wallet.signAndSendTransaction).toHaveBeenCalledWith(expect.any(Uint8Array), {
      minContextSlot: 42n,
    });
  });

  it("rejects when the wallet returns the wrong number of signatures", async () => {
    const wallet = createWallet({
      signAndSendTransactions: vi.fn().mockResolvedValue([SIGNATURE_BASE58]),
    });
    const signer = withWallet(wallet, () =>
      useWalletAccountTransactionSendingSigner(PAYER, "solana:devnet"),
    );

    await expect(
      signer.signAndSendTransactions([createTransaction(), createTransaction()]),
    ).rejects.toMatchObject({ code: "WALLET_FAILURE" });
  });

  it("rejects when the wallet returns a signature with an unexpected length", async () => {
    const wallet = createWallet({
      signAndSendTransaction: vi.fn().mockResolvedValue({ signature: "1" }),
    });
    const signer = withWallet(wallet, () =>
      useWalletAccountTransactionSendingSigner(PAYER, "solana:devnet"),
    );

    await expect(signer.signAndSendTransactions([createTransaction()])).rejects.toMatchObject({
      code: "WALLET_FAILURE",
    });
  });

  it("times out with TRANSACTION_TIMEOUT when the wallet never responds", async () => {
    vi.useFakeTimers();
    try {
      const wallet = createWallet({
        signAndSendTransaction: vi.fn(() => new Promise<never>(() => {})),
      });
      const signer = withWallet(wallet, () =>
        useWalletAccountTransactionSendingSigner(PAYER, "solana:devnet"),
      );

      const pending = signer.signAndSendTransactions([createTransaction()]);
      const expectation = expect(pending).rejects.toMatchObject({ code: "TRANSACTION_TIMEOUT" });

      await vi.advanceTimersByTimeAsync(120_000);
      await expectation;
    } finally {
      vi.useRealTimers();
    }
  });
});
