import { PublicKey } from "@solana/web3-compat";

export type PublicKeyInput = PublicKey | string | null | undefined;
export type MaybePublicKeyInput =
  | PublicKeyInput
  | { value: PublicKeyInput }
  | (() => PublicKeyInput);

export function parsePublicKey(value: MaybePublicKeyInput): PublicKey | null {
  const publicKeyInput = toPublicKeyInput(value);

  if (!publicKeyInput) {
    return null;
  }

  return typeof publicKeyInput === "string" ? new PublicKey(publicKeyInput) : publicKeyInput;
}

function toPublicKeyInput(value: MaybePublicKeyInput): PublicKeyInput {
  if (!value) {
    return null;
  }

  if (typeof value === "function") {
    return value();
  }

  if (value instanceof PublicKey || typeof value === "string") {
    return value;
  }

  return value.value;
}
