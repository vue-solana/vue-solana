import { PublicKey } from "@solana/web3-compat";
import { createSolanaError } from "./errors";

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

  if (typeof publicKeyInput !== "string") {
    return publicKeyInput;
  }

  try {
    return new PublicKey(publicKeyInput);
  } catch (cause) {
    throw createSolanaError("INVALID_ADDRESS", "Invalid Solana address", { cause });
  }
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
