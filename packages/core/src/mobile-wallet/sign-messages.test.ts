import { afterEach, describe, expect, it, vi } from "vitest";
import { signMobileWalletMessages } from "./sign-messages";

const { transact } = vi.hoisted(() => ({ transact: vi.fn() }));

vi.mock("@solana-mobile/mobile-wallet-adapter-protocol", () => ({ transact }));

const publicKey = new Uint8Array(32).fill(7);
const address = btoa(String.fromCharCode(...publicKey));
const message = new Uint8Array([1, 2, 3]);
const signedPayload = new Uint8Array([1, 2, 3, ...new Uint8Array(64).fill(9)]);
const appIdentity = { name: "Vue Solana", uri: "https://example.com" };

function createCache() {
  return { get: vi.fn().mockResolvedValue(cachedAuthorization()), set: vi.fn(), clear: vi.fn() };
}

function cachedAuthorization() {
  return {
    auth_token: "saved-token",
    wallet_uri_base: "https://wallet.example",
    chain: "solana:devnet",
    accounts: [],
    capabilities: {},
  };
}

function createMobileWallet(authorize: ReturnType<typeof vi.fn>) {
  const wallet = {
    authorize,
    signMessages: vi.fn().mockResolvedValue({
      signed_payloads: [btoa(String.fromCharCode(...signedPayload))],
    }),
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

describe("signMobileWalletMessages", () => {
  afterEach(() => {
    transact.mockReset();
  });

  it("signs after re-authorizing with the saved token", async () => {
    const wallet = createMobileWallet(
      vi.fn().mockResolvedValue(authorizationResult("saved-token")),
    );
    const authorizationCache = createCache();

    await expect(
      signMobileWalletMessages({ appIdentity, authorizationCache, publicKey, messages: [message] }),
    ).resolves.toEqual([signedPayload]);
    expect(wallet.authorize).toHaveBeenCalledWith({
      auth_token: "saved-token",
      identity: appIdentity,
      chain: "solana:devnet",
    });
    expect(wallet.signMessages).toHaveBeenCalledWith({
      addresses: [address],
      payloads: [btoa(String.fromCharCode(...message))],
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
      signMobileWalletMessages({ appIdentity, authorizationCache, publicKey, messages: [message] }),
    ).resolves.toEqual([signedPayload]);
    expect(transact).toHaveBeenCalledTimes(1);
    expect(authorize).toHaveBeenLastCalledWith({ identity: appIdentity, chain: "solana:devnet" });
    expect(authorizationCache.set).toHaveBeenCalledWith(
      expect.objectContaining({ auth_token: "fresh-token", wallet_uri_base: "https://w" }),
    );
    expect(wallet.signMessages).toHaveBeenCalledTimes(1);
  });

  it("reports both wallet errors when the fresh authorization fails too", async () => {
    createMobileWallet(
      vi
        .fn()
        .mockRejectedValueOnce(new Error("authorization request failed"))
        .mockRejectedValueOnce(new Error("user declined")),
    );

    await expect(
      signMobileWalletMessages({
        appIdentity,
        authorizationCache: createCache(),
        publicKey,
        messages: [message],
      }),
    ).rejects.toMatchObject({
      code: "WALLET_FAILURE",
      message: expect.stringMatching(/authorization request failed.*user declined/),
    });
  });

  it("refuses to sign when the wallet authorized another account", async () => {
    const wallet = createMobileWallet(
      vi.fn().mockResolvedValue(authorizationResult("saved-token", "b3RoZXI=")),
    );

    await expect(
      signMobileWalletMessages({
        appIdentity,
        authorizationCache: createCache(),
        publicKey,
        messages: [message],
      }),
    ).rejects.toMatchObject({ code: "WALLET_NOT_CONNECTED" });
    expect(wallet.signMessages).not.toHaveBeenCalled();
  });

  it("does not open the wallet without a saved authorization", async () => {
    await expect(
      signMobileWalletMessages({
        appIdentity,
        authorizationCache: {
          get: vi.fn().mockResolvedValue(undefined),
          set: vi.fn(),
          clear: vi.fn(),
        },
        publicKey,
        messages: [message],
      }),
    ).rejects.toMatchObject({ code: "WALLET_NOT_CONNECTED" });
    expect(transact).not.toHaveBeenCalled();
  });
});
