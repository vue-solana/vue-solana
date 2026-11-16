import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import type { SolanaWalletInfo } from "@vue-solana/core/types";
import { createSignableMessage, type SignatureBytes } from "@vue-solana/core/kit";
import {
  ACCOUNT,
  OTHER,
  PAYER,
  createWallet,
  withWallet,
} from "./wallet-account-signers.test-utils";
import { useWalletAccountMessageSigner } from "./useWalletAccountMessageSigner";

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

  it("rejects an empty account reference", () => {
    const signer = withWallet(createWallet(), () => useWalletAccountMessageSigner(null));

    expect(() => signer.address).toThrow();
    expect(signer.modifyAndSignMessages([signableMessage()])).rejects.toThrow();
  });

  it("rejects more than one message per request", async () => {
    const wallet = createWallet({ signMessage: vi.fn() });
    const signer = withWallet(wallet, () => useWalletAccountMessageSigner(PAYER));

    await expect(
      signer.modifyAndSignMessages([signableMessage(), signableMessage()]),
    ).rejects.toMatchObject({ code: "WALLET_FEATURE_UNSUPPORTED" });
    expect(wallet.signMessage).not.toHaveBeenCalled();
  });

  it("returns an empty array for empty input without contacting the wallet", async () => {
    const wallet = createWallet({ signMessage: vi.fn() });
    const signer = withWallet(wallet, () => useWalletAccountMessageSigner(PAYER));

    await expect(signer.modifyAndSignMessages([])).resolves.toEqual([]);
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

function signableMessage() {
  return createSignableMessage(new Uint8Array([1, 2, 3]));
}
