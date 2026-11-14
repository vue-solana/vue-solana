import { address, isAddress, type Address } from "@solana/kit";
import { createSolanaError } from "./errors";

export type AddressInput = Address | string | null | undefined;
/**
 * An address, ref-like `{ value }`, or getter — nested arbitrarily, since a
 * getter may return a ref and a ref may hold a getter. `parseAddress`
 * unwraps recursively; falsy values (`null`, `undefined`, `""`) mean absent.
 */
export type MaybeAddressInput =
  | AddressInput
  | { value: MaybeAddressInput }
  | (() => MaybeAddressInput);

/**
 * Parse a Solana address from a Kit `Address`, string, ref, or getter.
 *
 * Valid strings are returned as `Address`; invalid input throws a
 * `SolanaError` with code `INVALID_ADDRESS`.
 */
/**
 * Nesting budget for ref/getter unwrapping. A cyclic input (`const a = () => a`)
 * would otherwise recurse until the stack overflows, which surfaces as a
 * `RangeError` no app can catch meaningfully. Deeply nested *legitimate* inputs
 * are unrealistic; 32 is generous and keeps the failure deterministic.
 */
const MAX_ADDRESS_INPUT_DEPTH = 32;

export function parseAddress(value: MaybeAddressInput): Address | null {
  const input = toAddressInput(value, 0);

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

function toAddressInput(value: MaybeAddressInput, depth: number): AddressInput {
  if (!value) {
    return null;
  }

  if (depth > MAX_ADDRESS_INPUT_DEPTH) {
    throw createSolanaError(
      "INVALID_ADDRESS",
      `Invalid Solana address: input nests more than ${MAX_ADDRESS_INPUT_DEPTH} levels (possible cycle)`,
    );
  }

  if (typeof value === "function") {
    return toAddressInput(value() as MaybeAddressInput, depth + 1);
  }

  if (typeof value === "string") {
    return value;
  }

  // `Address` is a branded string, so any other string-shaped check above
  // already returned. Anything left that is not a `{ value }` ref-like is a
  // programmer error (number, object, boolean) — throwing `INVALID_ADDRESS`
  // beats silently returning `null` and skipping the read.
  if (typeof value === "object" && value !== null && "value" in value) {
    return toAddressInput((value as { value: MaybeAddressInput }).value, depth + 1);
  }

  throw createSolanaError(
    "INVALID_ADDRESS",
    "Invalid Solana address: expected an address string, ref, getter, null, or undefined",
  );
}
