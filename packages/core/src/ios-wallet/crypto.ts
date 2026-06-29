import bs58 from "bs58";
import * as naclModule from "tweetnacl";

export const nacl = resolveTweetNaCl();

export function createRequestId() {
  return bs58.encode(nacl.randomBytes(16));
}

export function getSharedSecret(
  walletEncryptionPublicKey: string | null | undefined,
  dappSecretKey: string,
) {
  if (!walletEncryptionPublicKey) {
    throw new Error("Missing iOS wallet encryption public key");
  }

  return nacl.box.before(bs58.decode(walletEncryptionPublicKey), bs58.decode(dappSecretKey));
}

export function encryptPayload(
  payload: Record<string, unknown>,
  nonce: Uint8Array,
  sharedSecret: Uint8Array,
) {
  return bs58.encode(nacl.box.after(encodeJson(payload), nonce, sharedSecret));
}

export function decryptPayload(data: string, nonce: string, sharedSecret: Uint8Array) {
  const decrypted = nacl.box.open.after(bs58.decode(data), bs58.decode(nonce), sharedSecret);

  if (!decrypted) {
    throw new Error("Unable to decrypt iOS wallet callback");
  }

  return JSON.parse(new TextDecoder().decode(decrypted)) as Record<string, unknown>;
}

function resolveTweetNaCl(): typeof naclModule {
  const moduleDefault = (naclModule as typeof naclModule & { default?: typeof naclModule }).default;
  const globalNacl = (globalThis as typeof globalThis & { nacl?: typeof naclModule }).nacl;

  return ("box" in naclModule ? naclModule : (moduleDefault ?? globalNacl)) as typeof naclModule;
}

function encodeJson(value: Record<string, unknown>) {
  return new TextEncoder().encode(JSON.stringify(value));
}
