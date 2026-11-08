import { afterEach, describe, expect, it, vi } from "vitest";
import {
  signAndSendMobileWalletTransactions,
  signMobileWalletMessages,
  signMobileWalletTransactions,
} from "./session";

const { transact } = vi.hoisted(() => ({ transact: vi.fn() }));

vi.mock("@solana-mobile/mobile-wallet-adapter-protocol", () => ({ transact }));

const publicKey = new Uint8Array(32).fill(7);
const address = toBase64(publicKey);
const message = new Uint8Array([1, 2, 3]);
const signedPayload = new Uint8Array([1, 2, 3, ...new Uint8Array(64).fill(9)]);
const transaction = new Uint8Array([4, 5, 6]);
const signedTransaction = new Uint8Array([4, 5, 6, 7]);
const signature = new Uint8Array(64).fill(8);
const appIdentity = { name: "Vue Solana", uri: "https://example.com" };

function toBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function createCache() {
  return {
    get: vi.fn().mockResolvedValue({
      auth_token: "saved-token",
      wallet_uri_base: "https://wallet.example",
      chain: "solana:devnet",
      accounts: [],
      capabilities: {},
    }),
    set: vi.fn(),
    clear: vi.fn(),
  };
}

function createMobileWallet(
  authorize = vi.fn().mockResolvedValue(authorizationResult("saved-token")),
  capabilities = { supports_sign_and_send_transactions: true },
) {
  const wallet = {
    authorize,
    getCapabilities: vi.fn().mockResolvedValue(capabilities),
    signMessages: vi.fn().mockResolvedValue({ signed_payloads: [toBase64(signedPayload)] }),
    signTransactions: vi.fn().mockResolvedValue({ signed_payloads: [toBase64(signedTransaction)] }),
    signAndSendTransactions: vi.fn().mockResolvedValue({ signatures: [toBase64(signature)] }),
  };
  transact.mockImplementation((callback: (mobileWallet: typeof wallet) => unknown) =>
    callback(wallet),
  );
  return wallet;
}

function authorizationResult(token: string, accountAddress = address) {
  return {
    accounts: [{ address: accountAddress }],
    auth_token: token,
    wallet_uri_base: "https://w",
  };
}

function sessionOptions(authorizationCache = createCache()) {
  return { appIdentity, authorizationCache, publicKey };
}

describe("mobile wallet session", () => {
  afterEach(() => {
    transact.mockReset();
  });

  describe("authorization", () => {
    it("re-authorizes with the saved token", async () => {
      const wallet = createMobileWallet();
      const authorizationCache = createCache();

      await signMobileWalletMessages(sessionOptions(authorizationCache), [message]);

      expect(wallet.authorize).toHaveBeenCalledWith({
        auth_token: "saved-token",
        identity: appIdentity,
        chain: "solana:devnet",
      });
      expect(authorizationCache.set).not.toHaveBeenCalled();
    });

    it("authorizes afresh in the same session when the saved token is rejected", async () => {
      const authorize = vi
        .fn()
        .mockRejectedValueOnce(new Error("authorization request failed"))
        .mockResolvedValueOnce(authorizationResult("fresh-token"));
      const wallet = createMobileWallet(authorize);
      const authorizationCache = createCache();

      await expect(
        signMobileWalletTransactions(sessionOptions(authorizationCache), [transaction]),
      ).resolves.toEqual([signedTransaction]);
      expect(transact).toHaveBeenCalledTimes(1);
      expect(authorize).toHaveBeenLastCalledWith({ identity: appIdentity, chain: "solana:devnet" });
      expect(authorizationCache.set).toHaveBeenCalledWith(
        expect.objectContaining({ auth_token: "fresh-token", wallet_uri_base: "https://w" }),
      );
      expect(wallet.signTransactions).toHaveBeenCalledTimes(1);
    });

    it("reports both wallet errors when the fresh authorization fails too", async () => {
      createMobileWallet(
        vi
          .fn()
          .mockRejectedValueOnce(new Error("authorization request failed"))
          .mockRejectedValueOnce(new Error("user declined")),
      );

      await expect(signMobileWalletMessages(sessionOptions(), [message])).rejects.toMatchObject({
        code: "WALLET_FAILURE",
        message: expect.stringMatching(/authorization request failed.*user declined/),
      });
    });

    it("refuses to sign when the wallet authorized another account", async () => {
      const wallet = createMobileWallet(
        vi.fn().mockResolvedValue(authorizationResult("saved-token", "b3RoZXI=")),
      );

      await expect(
        signAndSendMobileWalletTransactions(sessionOptions(), [transaction]),
      ).rejects.toMatchObject({ code: "WALLET_NOT_CONNECTED" });
      expect(wallet.signAndSendTransactions).not.toHaveBeenCalled();
    });

    it("does not open the wallet without a saved authorization", async () => {
      const authorizationCache = {
        get: vi.fn().mockResolvedValue(undefined),
        set: vi.fn(),
        clear: vi.fn(),
      };

      await expect(
        signMobileWalletMessages(sessionOptions(authorizationCache), [message]),
      ).rejects.toMatchObject({ code: "WALLET_NOT_CONNECTED" });
      expect(transact).not.toHaveBeenCalled();
    });
  });

  it("signs messages for the connected account", async () => {
    const wallet = createMobileWallet();

    await expect(signMobileWalletMessages(sessionOptions(), [message])).resolves.toEqual([
      signedPayload,
    ]);
    expect(wallet.signMessages).toHaveBeenCalledWith({
      addresses: [address],
      payloads: [toBase64(message)],
    });
  });

  it("signs transactions", async () => {
    const wallet = createMobileWallet();

    await expect(signMobileWalletTransactions(sessionOptions(), [transaction])).resolves.toEqual([
      signedTransaction,
    ]);
    expect(wallet.signTransactions).toHaveBeenCalledWith({ payloads: [toBase64(transaction)] });
  });

  it("signs and sends with the options in MWA's wire format", async () => {
    const wallet = createMobileWallet();

    await expect(
      signAndSendMobileWalletTransactions(sessionOptions(), [transaction], {
        skipPreflight: true,
        maxRetries: 3n,
        minContextSlot: 42n,
        preflightCommitment: "confirmed",
      }),
    ).resolves.toEqual([signature]);
    expect(wallet.signAndSendTransactions).toHaveBeenCalledWith({
      payloads: [toBase64(transaction)],
      options: {
        commitment: "confirmed",
        skip_preflight: true,
        max_retries: 3,
        min_context_slot: 42,
      },
    });
  });

  it("rejects signAndSend when the wallet does not support it", async () => {
    const wallet = createMobileWallet(undefined, { supports_sign_and_send_transactions: false });

    await expect(
      signAndSendMobileWalletTransactions(sessionOptions(), [transaction]),
    ).rejects.toMatchObject({ code: "WALLET_FEATURE_UNSUPPORTED" });
    expect(wallet.signAndSendTransactions).not.toHaveBeenCalled();
  });
});
