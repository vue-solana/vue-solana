import { address, isAddress, type Address } from "@solana/kit";
import { createSolanaError } from "./errors";

export type AddressInput = Address | string | null | undefined;
export type MaybeAddressInput = AddressInput | { value: AddressInput } | (() => AddressInput);

/**
 * Parse a Solana address from a Kit `Address`, string, ref, or getter.
 *
 * Valid strings are returned as `Address`; invalid input throws a
 * `SolanaError` with code `INVALID_ADDRESS`.
 */
export function parseAddress(value: MaybeAddressInput): Address | null {
  const input = toAddressInput(value);

  if (!input) {
    return null;
  }

  if (isAddress(input)) {
    return input;
  }

  try {
    return address(input);
  } catch (cause) {
    throw createSolanaError("INVALID_ADDRESS", "Invalid Solana address", { cause });
  }
}

function toAddressInput(value: MaybeAddressInput): AddressInput {
  if (!value) {
    return null;
  }

  if (typeof value === "function") {
    return value();
  }

  if (typeof value === "string") {
    return value;
  }

  return value.value;
}
