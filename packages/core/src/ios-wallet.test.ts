import { afterEach, describe, expect, it, vi } from "vitest";
import bs58 from "bs58";
import * as nacl from "tweetnacl";
import {
  adaptSolanaIosWallet,
  getSolanaIosWallets,
  handleSolanaIosWalletCallback,
  isSolanaIosBrowserWalletSupported,
} from "./ios-wallet";

describe("iOS browser wallets", () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    history.replaceState(null, "", "http://localhost:3000/");
  });

  it("detects iOS browser runtimes", () => {
    mockNavigator({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      platform: "iPhone",
      maxTouchPoints: 5,
    });

    expect(isSolanaIosBrowserWalletSupported()).toBe(true);
  });

  it("does not report support for Android browsers", () => {
    mockNavigator({
      userAgent:
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      platform: "Linux armv8l",
      maxTouchPoints: 5,
    });

    expect(isSolanaIosBrowserWalletSupported()).toBe(false);
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

  it("validates and stores iOS connect callbacks", () => {
    mockIosNavigator();
    vi.spyOn(window.location, "assign").mockImplementation(() => {});
    const [phantom] = getSolanaIosWallets({ redirectUrl: "https://example.com/callback" });
    const wallet = adaptSolanaIosWallet(phantom!, { redirectUrl: "https://example.com/callback" });

    void wallet.connect();

    const pending = JSON.parse(sessionStorage.getItem("vue-solana:ios-wallet:pending")!) as {
      dappEncryptionSecretKey: string;
    };
    const walletKeyPair = nacl.box.keyPair();
    const sharedSecret = nacl.box.before(
      bs58.decode(bs58.encode(walletKeyPair.publicKey)),
      bs58.decode(pending.dappEncryptionSecretKey),
    );
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const data = bs58.encode(
      nacl.box.after(
        new TextEncoder().encode(
          JSON.stringify({
            public_key: "11111111111111111111111111111111",
            session: "session-token",
          }),
        ),
        nonce,
        sharedSecret,
      ),
    );

    history.replaceState(
      null,
      "",
      `/?phantom_encryption_public_key=${bs58.encode(walletKeyPair.publicKey)}&nonce=${bs58.encode(nonce)}&data=${data}`,
    );

    const result = handleSolanaIosWalletCallback({ clearUrl: true });

    expect(result).toEqual({
      walletId: "phantom",
      method: "connect",
      publicKey: "11111111111111111111111111111111",
    });
    expect(sessionStorage.getItem("vue-solana:ios-wallet:pending")).toBeNull();
    expect(sessionStorage.getItem("vue-solana:ios-wallet:session:phantom")).toContain(
      "session-token",
    );
    expect(window.location.search).toBe("");
  });

  it("rejects callbacks without pending state", () => {
    history.replaceState(null, "", "/?nonce=nonce&data=data");

    expect(() => handleSolanaIosWalletCallback()).toThrow(
      "Received an iOS wallet callback without a pending request",
    );
  });

  it("rejects expired callbacks and clears pending state", () => {
    mockIosNavigator();
    vi.spyOn(window.location, "assign").mockImplementation(() => {});
    const [phantom] = getSolanaIosWallets({ redirectUrl: "https://example.com/callback" });
    const wallet = adaptSolanaIosWallet(phantom!, { redirectUrl: "https://example.com/callback" });

    void wallet.connect();

    const pending = JSON.parse(sessionStorage.getItem("vue-solana:ios-wallet:pending")!) as {
      createdAt: number;
    };
    sessionStorage.setItem(
      "vue-solana:ios-wallet:pending",
      JSON.stringify({ ...pending, createdAt: 0 }),
    );
    history.replaceState(null, "", "/?nonce=nonce&data=data");

    expect(() => handleSolanaIosWalletCallback()).toThrow(
      "Received an expired iOS wallet callback",
    );
    expect(sessionStorage.getItem("vue-solana:ios-wallet:pending")).toBeNull();
  });

  it("rejects incomplete callbacks and clears pending state", () => {
    mockIosNavigator();
    vi.spyOn(window.location, "assign").mockImplementation(() => {});
    const [phantom] = getSolanaIosWallets({ redirectUrl: "https://example.com/callback" });
    const wallet = adaptSolanaIosWallet(phantom!, { redirectUrl: "https://example.com/callback" });

    void wallet.connect();
    history.replaceState(null, "", "/?phantom_encryption_public_key=key&nonce=nonce");

    expect(() => handleSolanaIosWalletCallback()).toThrow(
      "Received an incomplete iOS wallet callback",
    );
    expect(sessionStorage.getItem("vue-solana:ios-wallet:pending")).toBeNull();
  });

  it("rejects connect callbacks with invalid public keys and does not store a session", () => {
    mockIosNavigator();
    vi.spyOn(window.location, "assign").mockImplementation(() => {});
    const [phantom] = getSolanaIosWallets({ redirectUrl: "https://example.com/callback" });
    const wallet = adaptSolanaIosWallet(phantom!, { redirectUrl: "https://example.com/callback" });

    void wallet.connect();
    setEncryptedConnectCallbackUrl({ publicKey: "not-a-public-key" });

    expect(() => handleSolanaIosWalletCallback()).toThrow(
      "iOS wallet callback returned an invalid public_key",
    );
    expect(sessionStorage.getItem("vue-solana:ios-wallet:pending")).toBeNull();
    expect(sessionStorage.getItem("vue-solana:ios-wallet:session:phantom")).toBeNull();
  });

  it.each([
    { requestedTransactionCount: 2, transactions: [bs58.encode(new Uint8Array([1, 2, 3]))] },
    {
      requestedTransactionCount: 1,
      transactions: [
        bs58.encode(new Uint8Array([1, 2, 3])),
        bs58.encode(new Uint8Array([4, 5, 6])),
      ],
    },
  ])(
    "rejects signAllTransactions callbacks with $transactions.length signed transactions for $requestedTransactionCount requested",
    ({ requestedTransactionCount, transactions }) => {
      setEncryptedSignAllTransactionsCallbackUrl({
        requestedTransactionCount,
        transactions,
      });

      expect(() => handleSolanaIosWalletCallback()).toThrow(
        `iOS wallet returned ${transactions.length} signed transactions for ${requestedTransactionCount} requested transactions`,
      );
      expect(sessionStorage.getItem("vue-solana:ios-wallet:pending")).toBeNull();
    },
  );

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

function setEncryptedConnectCallbackUrl({
  publicKey,
  session = "session-token",
}: {
  publicKey: string;
  session?: string;
}) {
  const pending = JSON.parse(sessionStorage.getItem("vue-solana:ios-wallet:pending")!) as {
    dappEncryptionSecretKey: string;
  };
  const walletKeyPair = nacl.box.keyPair();
  const sharedSecret = nacl.box.before(
    bs58.decode(bs58.encode(walletKeyPair.publicKey)),
    bs58.decode(pending.dappEncryptionSecretKey),
  );
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const data = bs58.encode(
    nacl.box.after(
      new TextEncoder().encode(
        JSON.stringify({
          public_key: publicKey,
          session,
        }),
      ),
      nonce,
      sharedSecret,
    ),
  );

  history.replaceState(
    null,
    "",
    `/?phantom_encryption_public_key=${bs58.encode(walletKeyPair.publicKey)}&nonce=${bs58.encode(nonce)}&data=${data}`,
  );
}

function setEncryptedSignAllTransactionsCallbackUrl({
  requestedTransactionCount,
  transactions,
}: {
  requestedTransactionCount: number;
  transactions: string[];
}) {
  const dappKeyPair = nacl.box.keyPair();
  const walletKeyPair = nacl.box.keyPair();
  const sharedSecret = nacl.box.before(walletKeyPair.publicKey, dappKeyPair.secretKey);

  sessionStorage.setItem(
    "vue-solana:ios-wallet:session:phantom",
    JSON.stringify({
      walletId: "phantom",
      publicKey: "11111111111111111111111111111111",
      session: "session-token",
      dappEncryptionPublicKey: bs58.encode(dappKeyPair.publicKey),
      dappEncryptionSecretKey: bs58.encode(dappKeyPair.secretKey),
      walletEncryptionPublicKey: bs58.encode(walletKeyPair.publicKey),
      sharedSecret: bs58.encode(sharedSecret),
    }),
  );
  sessionStorage.setItem(
    "vue-solana:ios-wallet:pending",
    JSON.stringify({
      id: "request-id",
      walletId: "phantom",
      method: "signAllTransactions",
      dappEncryptionPublicKey: bs58.encode(dappKeyPair.publicKey),
      dappEncryptionSecretKey: bs58.encode(dappKeyPair.secretKey),
      redirectUrl: "https://example.com/callback",
      createdAt: Date.now(),
      requestedTransactionCount,
    }),
  );

  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const data = bs58.encode(
    nacl.box.after(new TextEncoder().encode(JSON.stringify({ transactions })), nonce, sharedSecret),
  );

  history.replaceState(null, "", `/?nonce=${bs58.encode(nonce)}&data=${data}`);
}

function mockIosNavigator() {
  mockNavigator({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    platform: "iPhone",
    maxTouchPoints: 5,
  });
}

function mockNavigator(value: { userAgent: string; platform: string; maxTouchPoints: number }) {
  vi.stubGlobal("navigator", value);
}
