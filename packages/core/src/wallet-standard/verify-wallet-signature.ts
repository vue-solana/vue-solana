import type { ReadonlyUint8Array } from "@solana/kit";
import { isSignatureBytes, verifySignature } from "@solana/kit";
import { createSolanaError } from "../errors";

/**
 * Best-effort check that `signature` really is `publicKey`'s Ed25519 signature
 * over `signedMessage`, mirroring what Kit's `@solana/wallet-account-signer`
 * message signer does for message signing.
 *
 * Verifying needs Ed25519 in the WebCrypto API, which is not available in every
 * environment (older Safari, insecure contexts). When the key cannot be imported
 * — no WebCrypto, no Ed25519, or a malformed key — this resolves without
 * checking rather than failing a wallet whose signature the server will verify
 * anyway. When verification *is* available and the signature is wrong, it throws
 * `INVALID_SIGNATURE`.
 *
 * `label` names the signed artifact in the error message ("message", "sign-in").
 */
export async function assertWalletSignature(
  publicKey: ReadonlyUint8Array,
  signedMessage: ReadonlyUint8Array,
  signature: ReadonlyUint8Array,
  label: string,
): Promise<void> {
  let key: CryptoKey;

  try {
    // `as unknown as BufferSource` bridges lib.dom's `BufferSource` (which pins
    // `ArrayBuffer`) and the `ArrayBufferLike`-generic typed arrays Kit and
    // Wallet Standard use. Same bytes either way.
    key = await globalThis.crypto.subtle.importKey(
      "raw",
      publicKey as unknown as BufferSource,
      "Ed25519",
      true,
      ["verify"],
    );
  } catch {
    // No WebCrypto/Ed25519 in this environment (or the key is malformed): leave
    // verification to the server instead of rejecting a wallet prompt.
    return;
  }

  if (!isSignatureBytes(signature)) {
    throw createSolanaError(
      "INVALID_SIGNATURE",
      `The wallet returned a malformed ${label} signature.`,
    );
  }

  let valid: boolean;

  try {
    valid = await verifySignature(key, signature, signedMessage);
  } catch {
    return;
  }

  if (!valid) {
    throw createSolanaError(
      "INVALID_SIGNATURE",
      `The wallet returned an invalid ${label} signature.`,
    );
  }
}
