import { getBase58Decoder, getBase58Encoder } from "@solana/kit";
import * as naclModule from "tweetnacl";
import { createSolanaError } from "../errors";

let cachedNacl: typeof naclModule | undefined;

// ponytail: `tweetnacl` is 32.9 KB of the 67.4 KB eager chunk for
// `import { createSolanaPlugin } from "@vue-solana/vue"` (measured 2026-10-21;
// grep `plans/bundle-performance-followups.md` for the method) — and the iOS
// wallet flow is its only caller. `getNacl()` below does NOT get it out of that
// chunk: the static import on line 2 is the edge bundlers follow, and
// `dist/ios-wallet.mjs` is one flat file, so any import from that entry pulls
// it. The fix is `await import()`, and only ONE caller genuinely blocks that:
// the public synchronous `handleSolanaIosWalletCallback` (callback.ts), which
// `plugin.ts` runs at bootstrap. `getSolanaIosWallets` / `createPendingRequest`
// reach this file only through `createRequestId`'s `nacl.randomBytes(16)` —
// swap that for `crypto.getRandomValues` and the discovery path stops importing
// crypto at all. `launchConnect` is internal and only called from `async
// connect()`, so it can simply await. Non-breaking plan (thin crypto-free
// entry + gated deep-link import) is in `plans/bundle-performance-followups.md`;
// `scripts/check-lean-imports.mjs` fails CI if a new static edge lands.
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
