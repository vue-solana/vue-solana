import bs58 from "bs58";
import * as nacl from "tweetnacl";
import { vi } from "vitest";

export function resetIosWalletTestEnvironment() {
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  history.replaceState(null, "", "http://localhost:3000/");
}

export function setEncryptedConnectCallbackUrl({
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

export function setEncryptedSignAllTransactionsCallbackUrl({
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

export function mockIosNavigator() {
  mockNavigator({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    platform: "iPhone",
    maxTouchPoints: 5,
  });
}

export function mockNavigator(value: {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  userAgentData?: { platform: string };
}) {
  vi.stubGlobal("navigator", value);
}
