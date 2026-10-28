import { generateKeyPairSigner } from "@solana/kit";
import type { Address } from "@solana/kit";

export async function createSolanaPayReference(): Promise<Address> {
  const signer = await generateKeyPairSigner();
  return signer.address;
}

export async function findTransactionSignaturesByReference(rpc: unknown, reference: string) {
  const res = await (
    rpc as { getSignaturesForAddress: (addr: string) => { send: () => Promise<unknown> } }
  )
    .getSignaturesForAddress(reference)
    .send();
  return res;
}

export interface SolanaPayVerificationOptions {
  reference: string;
  expectedRecipient: string;
  expectedAmount?: bigint;
  expectedTokenMint?: string;
  commitment?: "processed" | "confirmed" | "finalized";
  timeoutMs?: number;
  pollIntervalMs?: number;
}

export interface SolanaPayVerificationResult {
  status: "pending" | "found" | "confirmed" | "finalized" | "expired" | "error";
  signature?: string;
  verified: boolean;
  reason?: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function verifySolanaPayPayment(
  rpc: unknown,
  options: SolanaPayVerificationOptions,
): Promise<SolanaPayVerificationResult> {
  const {
    reference,
    expectedRecipient,
    expectedAmount,
    expectedTokenMint,
    commitment = "confirmed",
    timeoutMs = 30000,
    pollIntervalMs = 1000,
  } = options;

  const deadline = Date.now() + timeoutMs;
  let signature: string | undefined;

  while (Date.now() < deadline) {
    try {
      const sigs = await findTransactionSignaturesByReference(rpc, reference);
      if (Array.isArray(sigs) && sigs.length > 0) {
        signature = sigs[0].signature;
        break;
      }
    } catch {
      return { status: "error", verified: false, reason: "rpc_failure" };
    }
    await sleep(pollIntervalMs);
  }

  if (!signature) {
    return { status: "expired", verified: false, reason: "no_payment_found" };
  }

  try {
    const tx = await (
      rpc as { getTransaction: (sig: string, opts: unknown) => { send: () => Promise<unknown> } }
    )
      .getTransaction(signature, { encoding: "jsonParsed", commitment })
      .send();

    if (!tx) {
      return { status: "pending", verified: false, signature, reason: "transaction_not_found" };
    }

    if ((tx as { meta?: { err?: unknown } }).meta?.err) {
      return { status: "error", verified: false, signature, reason: "transaction_failed" };
    }

    const confStatus = commitment === "finalized" ? "finalized" : "confirmed";

    const instructions =
      (tx as { transaction?: { message?: { instructions?: unknown[] } } }).transaction?.message
        ?.instructions ?? [];
    let matched = false;
    if (!expectedTokenMint) {
      for (const ix of instructions as Array<Record<string, unknown>>) {
        const parsed = ix.parsed as Record<string, unknown> | undefined;
        if (
          parsed?.type === "transfer" &&
          (parsed.info as Record<string, unknown> | undefined)?.destination === expectedRecipient
        ) {
          if (expectedAmount !== undefined) {
            const lamports = BigInt(
              ((parsed.info as Record<string, unknown>).lamports as string | number | bigint) ?? 0,
            );
            if (lamports === expectedAmount) matched = true;
          } else {
            matched = true;
          }
        }
      }
    } else {
      for (const ix of instructions as Array<Record<string, unknown>>) {
        const parsed = ix.parsed as Record<string, unknown> | undefined;
        if (parsed?.type === "transfer" || parsed?.type === "transferChecked") {
          const info = (parsed.info as Record<string, unknown>) ?? {};
          if (info.destination === expectedRecipient || info.owner === expectedRecipient) {
            if (expectedAmount !== undefined) {
              const amount = BigInt(
                ((info.amount as string | number | bigint) ??
                  (info.tokenAmount as Record<string, unknown> | undefined)?.amount ??
                  0) as string | number | bigint,
              );
              if (amount === expectedAmount) matched = true;
            } else {
              matched = true;
            }
          }
        }
      }
    }

    if (!matched) {
      return { status: "found", verified: false, signature, reason: "wrong_recipient_or_amount" };
    }

    return {
      status: confStatus as SolanaPayVerificationResult["status"],
      verified: true,
      signature,
    };
  } catch {
    return { status: "error", verified: false, signature, reason: "rpc_failure" };
  }
}
