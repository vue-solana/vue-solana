import { getBase58Decoder, getBase58Encoder } from "@solana/kit";
import * as naclModule from "tweetnacl";
import { createSolanaError } from "../errors";

let cachedNacl: typeof naclModule | undefined;

// ponytail: `tweetnacl` is 32 KB — 42% of the 77 KB initial chunk for
// `import { createSolanaPlugin } from "@vue-solana/vue"` — and the iOS wallet
// flow is its only caller. `getNacl()` below does NOT get it out of that chunk:
// the static import on line 2 is the edge bundlers follow, so the lazy call only
// avoids re-running the module body. The only real fix is `await import()`, which
// forces `getSharedSecret`, `encryptPayload`, `decryptPayload` and `createRequestId`
// async, and that cascades through the sync entry points `getSolanaIosWallets`,
// `handleSolanaIosWalletCallback`, `createPendingRequest` and `launchConnect`
// into the iOS deep-link return handler `plugin.ts` runs at bootstrap — a race
// against app startup. Revisit if a Kit/Wallet Standard API ever makes those async.
export function getNacl() {
  return (cachedNacl ??= resolveTweetNaCl());
}

export function createRequestId() {
  return getBase58Decoder().decode(getNacl().randomBytes(16));
}

export function getSharedSecret(
  walletEncryptionPublicKey: string | null | undefined,
  dappSecretKey: string,
) {
  if (!walletEncryptionPublicKey) {
    throw createSolanaError("INVALID_INPUT", "Missing iOS wallet encryption public key");
  }

  let walletPk: Uint8Array;
  let dappSk: Uint8Array;
  try {
    walletPk = Uint8Array.from(getBase58Encoder().encode(walletEncryptionPublicKey));
    dappSk = Uint8Array.from(getBase58Encoder().encode(dappSecretKey));
  } catch (cause) {
    throw createSolanaError("INVALID_INPUT", "Invalid iOS wallet encryption key encoding", {
      cause,
    });
  }

  if (walletPk.length !== getNacl().box.publicKeyLength) {
    throw createSolanaError("INVALID_INPUT", "Invalid iOS wallet encryption public key length");
  }
  if (dappSk.length !== getNacl().box.secretKeyLength) {
    throw createSolanaError("INVALID_INPUT", "Invalid iOS wallet dapp secret key length");
  }

  return getNacl().box.before(walletPk, dappSk);
}

export function encryptPayload(
  payload: Record<string, unknown>,
  nonce: Uint8Array,
  sharedSecret: Uint8Array,
) {
  if (sharedSecret.length !== getNacl().box.sharedKeyLength) {
    throw createSolanaError("INVALID_INPUT", "Invalid iOS wallet shared secret length");
  }
  if (nonce.length !== getNacl().box.nonceLength) {
    throw createSolanaError("INVALID_INPUT", "Invalid iOS wallet nonce length");
  }
  try {
    return getBase58Decoder().decode(getNacl().box.after(encodeJson(payload), nonce, sharedSecret));
  } catch (cause) {
    throw createSolanaError("INVALID_INPUT", "Failed to encrypt iOS wallet payload", { cause });
  }
}

export function decryptPayload(data: string, nonce: string, sharedSecret: Uint8Array) {
  let decodedData: Uint8Array;
  let decodedNonce: Uint8Array;
  try {
    decodedData = Uint8Array.from(getBase58Encoder().encode(data));
    decodedNonce = Uint8Array.from(getBase58Encoder().encode(nonce));
  } catch (cause) {
    throw createSolanaError("INVALID_INPUT", "Invalid iOS wallet callback encoding", { cause });
  }

  if (sharedSecret.length !== getNacl().box.sharedKeyLength) {
    throw createSolanaError("INVALID_INPUT", "Invalid iOS wallet shared secret length");
  }
  if (decodedNonce.length !== getNacl().box.nonceLength) {
    throw createSolanaError("INVALID_INPUT", "Invalid iOS wallet callback nonce length");
  }

  const decrypted = getNacl().box.open.after(decodedData, decodedNonce, sharedSecret);

  if (!decrypted) {
    throw createSolanaError("DECRYPTION_FAILED", "Unable to decrypt iOS wallet callback");
  }

  try {
    return JSON.parse(new TextDecoder().decode(decrypted)) as Record<string, unknown>;
  } catch (cause) {
    throw createSolanaError("DECRYPTION_FAILED", "Unable to decode iOS wallet callback payload", {
      cause,
    });
  }
}

function resolveTweetNaCl(): typeof naclModule {
  const moduleDefault = (naclModule as typeof naclModule & { default?: typeof naclModule }).default;
  const globalNacl = (globalThis as typeof globalThis & { nacl?: typeof naclModule }).nacl;

  return ("box" in naclModule ? naclModule : (moduleDefault ?? globalNacl)) as typeof naclModule;
}

function encodeJson(value: Record<string, unknown>) {
  return new TextEncoder().encode(JSON.stringify(value));
}
