import { PublicKey } from "@solana/web3-compat";

export type PublicKeyInput = PublicKey | string | null | undefined;

export function parsePublicKey(value: PublicKeyInput): PublicKey | null {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? new PublicKey(value) : value;
}
