import bs58 from "bs58";
import * as tweetnacl from "tweetnacl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { decryptPayload } from "./crypto";
import { IOS_WALLETS } from "./definitions";
import { launchSignAllTransactions, launchSignTransaction } from "./deep-links";
import { getPendingRequest, storeSession } from "./storage";
import { resetIosWalletTestEnvironment } from "./test-utils";
import type { IosWalletDefinition } from "./types";

describe("iOS wallet deep links", () => {
  afterEach(resetIosWalletTestEnvironment);

  it("rejects signing requests before an iOS wallet is connected", async () => {
    await expect(
      launchSignTransaction(getPhantomDefinition(), createTestTransaction(), {
        redirectUrl: "https://example.com/callback",
      }),
    ).rejects.toThrow("Connect the iOS wallet before signing");
  });

  it("launches encrypted signTransaction links and records pending callback state", () => {
    const session = storeTestSession();
    const assign = vi.spyOn(window.location, "assign").mockImplementation(() => {});
    const transaction = createTestTransaction();

    void launchSignTransaction(getPhantomDefinition(), transaction, {
      redirectUrl: "https://example.com/callback",
    });

    expect(assign).toHaveBeenCalledOnce();

    const url = new URL(assign.mock.calls[0]?.[0] as string);
    const pending = getPendingRequest();
    const payload = decryptLaunchedPayload(url, session.sharedSecret);

    expect(url.origin).toBe("https://phantom.app");
    expect(url.pathname).toBe("/ul/v1/signTransaction");
    expect(url.searchParams.get("dapp_encryption_public_key")).toBe(
      session.dappEncryptionPublicKey,
    );
    expect(url.searchParams.get("redirect_link")).toBe("https://example.com/callback");
    expect(url.searchParams.get("nonce")).toBeTruthy();
    expect(url.searchParams.get("payload")).toBeTruthy();
    expect(payload).toEqual({
      transaction: bs58.encode(transaction),
      session: "session-token",
    });
    expect(pending).toMatchObject({
      walletId: "phantom",
      method: "signTransaction",
      redirectUrl: "https://example.com/callback",
    });
    expect(pending?.requestedTransactionCount).toBeUndefined();
  });

  it("records requested transaction counts for signAllTransactions links", () => {
    const session = storeTestSession();
    const assign = vi.spyOn(window.location, "assign").mockImplementation(() => {});
    const transactions = [createTestTransaction(), createTestTransaction()];

    void launchSignAllTransactions(getPhantomDefinition(), transactions, {
      redirectUrl: "https://example.com/callback",
    });

    const url = new URL(assign.mock.calls[0]?.[0] as string);
    const pending = getPendingRequest();
    const payload = decryptLaunchedPayload(url, session.sharedSecret);

    expect(url.pathname).toBe("/ul/v1/signAllTransactions");
    expect(payload).toEqual({
      transactions: transactions.map((transaction) => bs58.encode(transaction)),
      session: "session-token",
    });
    expect(pending).toMatchObject({
      walletId: "phantom",
      method: "signAllTransactions",
      requestedTransactionCount: 2,
    });
  });
});

function getPhantomDefinition(): IosWalletDefinition {
  return IOS_WALLETS[0]!;
}

function createTestTransaction() {
  return new Uint8Array([1, 2, 3, 4, 5]);
}

function storeTestSession() {
  const dappKeyPair = tweetnacl.box.keyPair();
  const walletKeyPair = tweetnacl.box.keyPair();
  const sharedSecret = tweetnacl.box.before(walletKeyPair.publicKey, dappKeyPair.secretKey);
  const session = {
    walletId: "phantom",
    publicKey: "11111111111111111111111111111111",
    session: "session-token",
    dappEncryptionPublicKey: bs58.encode(dappKeyPair.publicKey),
    dappEncryptionSecretKey: bs58.encode(dappKeyPair.secretKey),
    walletEncryptionPublicKey: bs58.encode(walletKeyPair.publicKey),
    sharedSecret: bs58.encode(sharedSecret),
  };

  storeSession(session);

  return session;
}

function decryptLaunchedPayload(url: URL, sharedSecret: string) {
  return decryptPayload(
    url.searchParams.get("payload")!,
    url.searchParams.get("nonce")!,
    bs58.decode(sharedSecret),
  );
}
