import { findTransactionSignaturesByReference } from "./solana-pay-confirmation";

export type SolanaPayPaymentStatus =
  | "pending"
  | "found"
  | "confirmed"
  | "finalized"
  | "expired"
  | "error";

export async function getSolanaPayPaymentStatus(
  rpc: unknown,
  reference: string,
): Promise<SolanaPayPaymentStatus> {
  try {
    const sigs = await findTransactionSignaturesByReference(rpc, reference);
    if (!sigs || (Array.isArray(sigs) && sigs.length === 0)) return "pending";
    return "found";
  } catch {
    return "error";
  }
}
