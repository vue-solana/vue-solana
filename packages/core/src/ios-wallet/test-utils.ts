import { getBase58Decoder, getBase58Encoder } from "@solana/kit";
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
    walletKeyPair.publicKey,
    Uint8Array.from(getBase58Encoder().encode(pending.dappEncryptionSecretKey)),
  );
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const data = getBase58Decoder().decode(
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
    `/?phantom_encryption_public_key=${getBase58Decoder().decode(walletKeyPair.publicKey)}&nonce=${getBase58Decoder().decode(nonce)}&data=${data}`,
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
      dappEncryptionPublicKey: getBase58Decoder().decode(dappKeyPair.publicKey),
      dappEncryptionSecretKey: getBase58Decoder().decode(dappKeyPair.secretKey),
      walletEncryptionPublicKey: getBase58Decoder().decode(walletKeyPair.publicKey),
      sharedSecret: getBase58Decoder().decode(sharedSecret),
    }),
  );
  sessionStorage.setItem(
    "vue-solana:ios-wallet:pending",
    JSON.stringify({
      id: "request-id",
      walletId: "phantom",
      method: "signAllTransactions",
      dappEncryptionPublicKey: getBase58Decoder().decode(dappKeyPair.publicKey),
      dappEncryptionSecretKey: getBase58Decoder().decode(dappKeyPair.secretKey),
      redirectUrl: "https://example.com/callback",
      createdAt: Date.now(),
      requestedTransactionCount,
    }),
  );

  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const data = getBase58Decoder().decode(
    nacl.box.after(new TextEncoder().encode(JSON.stringify({ transactions })), nonce, sharedSecret),
  );

  history.replaceState(null, "", `/?nonce=${getBase58Decoder().decode(nonce)}&data=${data}`);
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
