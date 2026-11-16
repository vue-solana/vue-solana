import { describe, expect, it, vi } from "vitest";
import type { SolanaTransaction, SolanaWalletInfo } from "@vue-solana/core/types";
import {
  address,
  appendTransactionMessageInstruction,
  compileTransaction,
  createTransactionMessage,
  getTransactionDecoder,
  getTransactionEncoder,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type SignatureBytes,
} from "@vue-solana/core/kit";
import {
  ACCOUNT,
  BLOCKHASH,
  OTHER,
  OTHER_BLOCKHASH,
  PAYER,
  createTransaction,
  createWallet,
  withWallet,
} from "./wallet-account-signers.test-utils";
import { useWalletAccountTransactionSigner } from "./useWalletAccountTransactionSigner";

describe("useWalletAccountTransactionSigner", () => {
  it("exposes a transaction-modifying signer for the account", () => {
    const signer = withWallet(createWallet(), () =>
      useWalletAccountTransactionSigner(ACCOUNT, "solana:devnet"),
    );

    expect(signer.address).toBe(PAYER);
    expect(typeof signer.modifyAndSignTransactions).toBe("function");
  });

  it("rejects a chain that is not a Solana identifier", () => {
    expect(() =>
      withWallet(createWallet(), () =>
        useWalletAccountTransactionSigner(PAYER, "ethereum:mainnet"),
      ),
    ).toThrow(/solana/);
  });

  it("signs the wire transaction and re-attaches a lifetime constraint", async () => {
    const wallet = createWallet({
      signTransaction: vi.fn(async (bytes: SolanaTransaction) => signWireTransaction(bytes)),
    });
    const signer = withWallet(wallet, () =>
      useWalletAccountTransactionSigner(PAYER, "solana:devnet"),
    );
    const transaction = createTransaction();

    const signed = await signer.modifyAndSignTransactions([transaction]);

    expect(wallet.signTransaction).toHaveBeenCalledTimes(1);
    expect(signed).toHaveLength(1);
    expect(Object.isFrozen(signed)).toBe(true);
    expect(signed[0]?.messageBytes).toEqual(transaction.messageBytes);
    expect(
      (signed[0] as { lifetimeConstraint: { blockhash: string } }).lifetimeConstraint.blockhash,
    ).toBe(BLOCKHASH);
  });

  it("rejects batch requests instead of prompting once per transaction", async () => {
    const wallet = createWallet({ signTransaction: vi.fn() });
    const signer = withWallet(wallet, () =>
      useWalletAccountTransactionSigner(PAYER, "solana:devnet"),
    );

    await expect(
      signer.modifyAndSignTransactions([createTransaction(), createTransaction()]),
    ).rejects.toMatchObject({ code: "WALLET_FEATURE_UNSUPPORTED" });
    expect(wallet.signTransaction).not.toHaveBeenCalled();
  });

  it("returns an empty array without contacting the wallet", async () => {
    const wallet = createWallet({ signTransaction: vi.fn() });
    const signer = withWallet(wallet, () =>
      useWalletAccountTransactionSigner(PAYER, "solana:devnet"),
    );

    await expect(signer.modifyAndSignTransactions([])).resolves.toEqual([]);
    expect(wallet.signTransaction).not.toHaveBeenCalled();
  });

  it("fails fast with a pre-aborted signal", async () => {
    const wallet = createWallet({ signTransaction: vi.fn() });
    const signer = withWallet(wallet, () =>
      useWalletAccountTransactionSigner(PAYER, "solana:devnet"),
    );
    const controller = new AbortController();
    controller.abort(new Error("stopped"));

    await expect(
      signer.modifyAndSignTransactions([createTransaction()], { abortSignal: controller.signal }),
    ).rejects.toMatchObject({ message: "stopped" });
    expect(wallet.signTransaction).not.toHaveBeenCalled();
  });

  it("fails fast when no wallet is selected", async () => {
    const signer = withWallet(null, () =>
      useWalletAccountTransactionSigner(PAYER, "solana:devnet"),
    );

    await expect(signer.modifyAndSignTransactions([createTransaction()])).rejects.toMatchObject({
      code: "NO_WALLET_SELECTED",
    });
  });

  it("rejects a disconnected wallet", async () => {
    const wallet = createWallet({ connected: false, signTransaction: vi.fn() });
    const signer = withWallet(wallet, () =>
      useWalletAccountTransactionSigner(PAYER, "solana:devnet"),
    );

    await expect(signer.modifyAndSignTransactions([createTransaction()])).rejects.toMatchObject({
      code: "WALLET_NOT_CONNECTED",
    });
    expect(wallet.signTransaction).not.toHaveBeenCalled();
  });

  it("rejects a signer built for a different connected account", async () => {
    const wallet = createWallet({ signTransaction: vi.fn() });
    const signer = withWallet(wallet, () =>
      useWalletAccountTransactionSigner(OTHER, "solana:devnet"),
    );

    await expect(signer.modifyAndSignTransactions([createTransaction()])).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
    expect(wallet.signTransaction).not.toHaveBeenCalled();
  });

  it("derives a fresh lifetime constraint when the wallet rewrites the transaction bytes", async () => {
    const original = createTransaction(BLOCKHASH);
    const rewritten = createTransaction(OTHER_BLOCKHASH);
    const rewrittenBytes = getTransactionEncoder().encode({
      ...rewritten,
      signatures: { [PAYER]: new Uint8Array(64).fill(9) as SignatureBytes },
    });
    const wallet = createWallet({
      signTransaction: vi.fn(async () => rewrittenBytes),
    });
    const signer = withWallet(wallet, () =>
      useWalletAccountTransactionSigner(PAYER, "solana:devnet"),
    );

    const [signed] = await signer.modifyAndSignTransactions([original]);

    expect(signed?.messageBytes).toEqual(rewritten.messageBytes);
    expect(
      (signed as { lifetimeConstraint: { blockhash: string } }).lifetimeConstraint.blockhash,
    ).toBe(OTHER_BLOCKHASH);
  });

  it("rejects when the wallet returns an oversized signed transaction", async () => {
    const oversized = pipe(
      createTransactionMessage({ version: 0 }),
      (next) => setTransactionMessageFeePayer(PAYER, next),
      (next) =>
        setTransactionMessageLifetimeUsingBlockhash(
          { blockhash: BLOCKHASH, lastValidBlockHeight: 100n },
          next,
        ),
      (next) =>
        appendTransactionMessageInstruction(
          {
            programAddress: address("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
            data: new Uint8Array(2000),
          },
          next,
        ),
    );
    const oversizedBytes = getTransactionEncoder().encode({
      ...compileTransaction(oversized),
      signatures: { [PAYER]: new Uint8Array(64).fill(9) as SignatureBytes },
    });
    const wallet = createWallet({
      signTransaction: vi.fn(async () => oversizedBytes),
    });
    const signer = withWallet(wallet, () =>
      useWalletAccountTransactionSigner(PAYER, "solana:devnet"),
    );

    await expect(signer.modifyAndSignTransactions([createTransaction()])).rejects.toThrow();
  });

  it("rejects when the account object does not support the requested chain", async () => {
    const account: SolanaWalletInfo["accounts"][number] = {
      ...ACCOUNT,
      chains: ["solana:mainnet"],
    };
    const signer = withWallet(createWallet(), () =>
      useWalletAccountTransactionSigner(account, "solana:devnet"),
    );

    await expect(signer.modifyAndSignTransactions([createTransaction()])).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
  });
});

function signWireTransaction(bytes: SolanaTransaction): SolanaTransaction {
  const decoded = getTransactionDecoder().decode(bytes);

  return getTransactionEncoder().encode({
    ...decoded,
    signatures: { [PAYER]: new Uint8Array(64).fill(7) as SignatureBytes },
  });
}
