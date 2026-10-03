import bs58 from "bs58";
import * as naclModule from "tweetnacl";
import { createSolanaError } from "../errors";

let cachedNacl: typeof naclModule | undefined;

// Resolved on first use rather than at module load. `tweetnacl` is 32 KB and the
// iOS wallet flow is the only caller, so a module-scope call makes bundlers keep
// it in the initial chunk of every app, iOS or not.
export function getNacl() {
  return (cachedNacl ??= resolveTweetNaCl());
}

export function createRequestId() {
  return bs58.encode(getNacl().randomBytes(16));
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
    walletPk = bs58.decode(walletEncryptionPublicKey);
    dappSk = bs58.decode(dappSecretKey);
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
    return bs58.encode(getNacl().box.after(encodeJson(payload), nonce, sharedSecret));
  } catch (cause) {
    throw createSolanaError("INVALID_INPUT", "Failed to encrypt iOS wallet payload", { cause });
  }
}

export function decryptPayload(data: string, nonce: string, sharedSecret: Uint8Array) {
  let decodedData: Uint8Array;
  let decodedNonce: Uint8Array;
  try {
    decodedData = bs58.decode(data);
    decodedNonce = bs58.decode(nonce);
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
