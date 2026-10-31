import { address } from "@solana/kit";
import type { Recipient, SPLToken } from "./types";

/**
 * Safely convert a string address to an `SPLToken`.
 */
export function createSPLToken(tokenAddress: string): SPLToken {
  try {
    return address(tokenAddress);
  } catch (error) {
    throw new Error(`Invalid SPL token address: ${tokenAddress}. ${String(error)}`, {
      cause: error,
    });
  }
}

/**
 * Safely convert a string address to a `Recipient`.
 */
export function createRecipient(recipientAddress: string): Recipient {
  try {
    return address(recipientAddress);
  } catch (error) {
    throw new Error(`Invalid recipient address: ${recipientAddress}. ${String(error)}`, {
      cause: error,
    });
  }
}

/**
 * Validate a string as a Solana address.
 */
export function isValidSolanaAddress(addr: string): boolean {
  try {
    address(addr);
    return true;
  } catch {
    return false;
  }
}
