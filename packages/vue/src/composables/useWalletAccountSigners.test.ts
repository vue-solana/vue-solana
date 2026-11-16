import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref, shallowRef } from "vue";
import type { SolanaTransaction, SolanaWallet, SolanaWalletInfo } from "@vue-solana/core/types";
import {
  address,
  compileTransaction,
  createSignableMessage,
  createTransactionMessage,
  getTransactionDecoder,
  getTransactionEncoder,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type Blockhash,
  type SignatureBytes,
  type Transaction,
} from "@vue-solana/core/kit";
import { createMockSolanaContext, mountWithSolana } from "../../test-utils";
import { useWalletAccountMessageSigner } from "./useWalletAccountMessageSigner";
import { useWalletAccountTransactionSendingSigner } from "./useWalletAccountTransactionSendingSigner";
import { useWalletAccountTransactionSigner } from "./useWalletAccountTransactionSigner";

const PAYER = address("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin");
const OTHER = address("Vote111111111111111111111111111111111111111");
const BLOCKHASH = "11111111111111111111111111111111" as Blockhash;
const SIGNATURE_BASE58 = "1".repeat(64);

const ACCOUNT: SolanaWalletInfo["accounts"][number] = {
  address: PAYER,
  publicKey: new Uint8Array(32),
  chains: ["solana:devnet"],
};

describe("useWalletAccountMessageSigner", () => {
  it("exposes a message-modifying signer for the account", () => {
    const signer = withWallet(createWallet(), () => useWalletAccountMessageSigner(ACCOUNT));

    expect(signer.address).toBe(PAYER);
    expect(typeof signer.modifyAndSignMessages).toBe("function");
  });

  it("also accepts the account address directly", () => {
    const signer = withWallet(createWallet(), () => useWalletAccountMessageSigner(PAYER));

    expect(signer.address).toBe(PAYER);
  });

  it("follows a ref so one signer tracks the selected account", () => {
    const selected = ref<SolanaWalletInfo["accounts"][number] | null>(ACCOUNT);
    const signer = withWallet(createWallet(), () => useWalletAccountMessageSigner(selected));

    expect(signer.address).toBe(PAYER);

    selected.value = { ...ACCOUNT, address: OTHER };

    expect(signer.address).toBe(OTHER);
  });

  it("signs and merges the signature into the message", async () => {
    const content = new Uint8Array([1, 2, 3]);
    const existing = new Uint8Array(64).fill(4);
    const signature = new Uint8Array(64).fill(5);
    const wallet = createWallet({
      signMessage: vi.fn().mockResolvedValue({ signedMessage: content, signature }),
    });
    const signer = withWallet(wallet, () => useWalletAccountMessageSigner(PAYER));
    const message = createSignableMessage(content, { [OTHER]: existing as SignatureBytes });

    const [signed] = await signer.modifyAndSignMessages([message]);

    expect(wallet.signMessage).toHaveBeenCalledWith(content);
    expect(signed?.content).toEqual(content);
    expect(signed?.signatures[PAYER]).toEqual(signature);
    expect(signed?.signatures[OTHER]).toEqual(existing);
  });

  it("drops signatures that covered the old bytes when the wallet rewrites the message", async () => {
    const content = new Uint8Array([1, 2, 3]);
    const rewritten = new Uint8Array([9, 9, 9]);
    const signature = new Uint8Array(64).fill(5);
    const wallet = createWallet({
      signMessage: vi.fn().mockResolvedValue({ signedMessage: rewritten, signature }),
    });
    const signer = withWallet(wallet, () => useWalletAccountMessageSigner(PAYER));
    const message = createSignableMessage(content, {
      [OTHER]: new Uint8Array(64).fill(4) as SignatureBytes,
    });

    const [signed] = await signer.modifyAndSignMessages([message]);

    expect(signed?.content).toEqual(rewritten);
    expect(signed?.signatures[PAYER]).toEqual(signature);
    expect(signed?.signatures[OTHER]).toBeUndefined();
  });

  it("fails fast when no wallet is selected", async () => {
    const signer = withWallet(null, () => useWalletAccountMessageSigner(PAYER));

    await expect(signer.modifyAndSignMessages([signableMessage()])).rejects.toMatchObject({
      code: "NO_WALLET_SELECTED",
    });
  });

  it("rejects a disconnected wallet", async () => {
    const wallet = createWallet({ connected: false, signMessage: vi.fn() });
    const signer = withWallet(wallet, () => useWalletAccountMessageSigner(PAYER));

    await expect(signer.modifyAndSignMessages([signableMessage()])).rejects.toMatchObject({
      code: "WALLET_NOT_CONNECTED",
    });
    expect(wallet.signMessage).not.toHaveBeenCalled();
  });

  it("rejects when the signer account is not the connected account", async () => {
    const wallet = createWallet({ signMessage: vi.fn() });
    const signer = withWallet(wallet, () => useWalletAccountMessageSigner(OTHER));

    await expect(signer.modifyAndSignMessages([signableMessage()])).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
    expect(wallet.signMessage).not.toHaveBeenCalled();
  });

  it("rejects a wallet that cannot sign messages", async () => {
    const signer = withWallet(createWallet(), () => useWalletAccountMessageSigner(PAYER));

    await expect(signer.modifyAndSignMessages([signableMessage()])).rejects.toMatchObject({
      code: "WALLET_FEATURE_UNSUPPORTED",
    });
  });

  it("rejects batch requests instead of prompting once per message", async () => {
    const wallet = createWallet({ signMessage: vi.fn() });
    const signer = withWallet(wallet, () => useWalletAccountMessageSigner(PAYER));

    await expect(
      signer.modifyAndSignMessages([signableMessage(), signableMessage()]),
    ).rejects.toMatchObject({ code: "WALLET_FEATURE_UNSUPPORTED" });
    expect(wallet.signMessage).not.toHaveBeenCalled();
  });

  it("honors an already-aborted signal without reaching the wallet", async () => {
    const wallet = createWallet({ signMessage: vi.fn() });
    const signer = withWallet(wallet, () => useWalletAccountMessageSigner(PAYER));
    const controller = new AbortController();

    controller.abort();

    await expect(
      signer.modifyAndSignMessages([signableMessage()], { abortSignal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(wallet.signMessage).not.toHaveBeenCalled();
  });
});

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
});

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
});

function signableMessage() {
  return createSignableMessage(new Uint8Array([1, 2, 3]));
}

function createTransaction(): Transaction {
  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (next) => setTransactionMessageFeePayer(PAYER, next),
    (next) =>
      setTransactionMessageLifetimeUsingBlockhash(
        { blockhash: BLOCKHASH, lastValidBlockHeight: 100n },
        next,
      ),
  );

  return compileTransaction(message);
}

function signWireTransaction(bytes: SolanaTransaction): SolanaTransaction {
  const decoded = getTransactionDecoder().decode(bytes);

  return getTransactionEncoder().encode({
    ...decoded,
    signatures: { [PAYER]: new Uint8Array(64).fill(7) as SignatureBytes },
  });
}

function createWallet(overrides: Partial<SolanaWallet> = {}): SolanaWallet {
  return {
    publicKey: PAYER,
    connected: true,
    connect: vi.fn(),
    disconnect: vi.fn(),
    ...overrides,
  } as unknown as SolanaWallet;
}

function withWallet<T>(wallet: SolanaWallet | null, create: () => T): T {
  let result: T | undefined;
  const context = createMockSolanaContext({ wallet: shallowRef(wallet) });

  mountWithSolana(
    defineComponent({
      setup() {
        result = create();

        return () => h("div");
      },
    }),
    context,
  );

  return result as T;
}
