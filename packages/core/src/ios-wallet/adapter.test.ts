import { afterEach, describe, expect, it, vi } from "vitest";
import { adaptSolanaIosWallet, getSolanaIosWallets } from "./adapter";
import { mockIosNavigator, mockNavigator, resetIosWalletTestEnvironment } from "./test-utils";

describe("iOS wallet adapter", () => {
  afterEach(resetIosWalletTestEnvironment);

  it("returns no wallets for unsupported browsers", () => {
    mockNavigator({
      userAgent:
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      platform: "Linux armv8l",
      maxTouchPoints: 5,
    });

    expect(getSolanaIosWallets()).toEqual([]);
  });

  it("returns iOS fallback entries with documented capabilities", () => {
    mockIosNavigator();

    const wallets = getSolanaIosWallets({
      chains: ["solana:devnet"],
      redirectUrl: "https://example.com/callback",
    });

    expect(wallets.map((wallet) => wallet.name)).toEqual(["Phantom", "Solflare", "Backpack"]);
    expect(wallets[0]).toMatchObject({
      platform: "mobile",
      source: "deep-link",
      callbackUrl: "https://example.com/callback",
      capabilities: {
        connect: true,
        disconnect: true,
        signTransaction: true,
        signAllTransactions: true,
        signAndSendTransaction: false,
      },
    });
    expect(wallets[1]?.capabilities?.signAndSendTransaction).toBe(true);
    expect(wallets[2]?.capabilities?.signAndSendTransaction).toBe(true);
  });

  it("launches iOS connect links and records pending callback state", () => {
    mockIosNavigator();
    const assign = vi.spyOn(window.location, "assign").mockImplementation(() => {});
    const [phantom] = getSolanaIosWallets({
      cluster: "devnet",
      redirectUrl: "https://example.com/callback",
    });
    const wallet = adaptSolanaIosWallet(phantom!, {
      cluster: "devnet",
      redirectUrl: "https://example.com/callback",
      appIdentity: { name: "Test App", uri: "https://example.com" },
    });

    void wallet.connect();

    expect(assign).toHaveBeenCalledOnce();

    const url = new URL(assign.mock.calls[0]?.[0] as string);

    expect(url.origin).toBe("https://phantom.app");
    expect(url.pathname).toBe("/ul/v1/connect");
    expect(url.searchParams.get("cluster")).toBe("devnet");
    expect(url.searchParams.get("app_url")).toBe("https://example.com");
    expect(url.searchParams.get("redirect_link")).toBe("https://example.com/callback");
    expect(sessionStorage.getItem("vue-solana:ios-wallet:pending")).toContain("phantom");
  });

  it("ignores and removes stored sessions with invalid public keys", () => {
    mockIosNavigator();
    sessionStorage.setItem(
      "vue-solana:ios-wallet:session:phantom",
      JSON.stringify({
        walletId: "phantom",
        publicKey: "not-a-public-key",
        session: "session-token",
        dappEncryptionPublicKey: "dapp-public-key",
        dappEncryptionSecretKey: "dapp-secret-key",
        walletEncryptionPublicKey: "wallet-public-key",
        sharedSecret: "shared-secret",
      }),
    );

    const [phantom] = getSolanaIosWallets({ chains: ["solana:devnet"] });

    expect(phantom?.accounts).toEqual([]);
    expect(sessionStorage.getItem("vue-solana:ios-wallet:session:phantom")).toBeNull();
  });
});
