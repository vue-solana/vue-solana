import { SOLANA_PROTOCOL, HTTPS_PROTOCOL, SOL_DECIMALS } from "./constants";
import type { Amount, Label, Link, Memo, Message, Recipient, References, SPLToken } from "./types";

/**
 * Fields of a Solana Pay transfer request URL.
 */
export interface TransferRequestURLFields {
  /** `recipient` in the [Solana Pay spec](https://github.com/solana-labs/solana-pay/blob/master/SPEC.md#recipient). */
  recipient: Recipient;
  /** `amount` in the [Solana Pay spec](https://github.com/solana-labs/solana-pay/blob/master/SPEC.md#amount). */
  amount?: Amount;
  /** `spl-token` in the [Solana Pay spec](https://github.com/solana-labs/solana-pay/blob/master/SPEC.md#spl-token). */
  splToken?: SPLToken;
  /** `reference` in the [Solana Pay spec](https://github.com/solana-labs/solana-pay/blob/master/SPEC.md#reference). */
  reference?: References;
  /** `label` in the [Solana Pay spec](https://github.com/solana-labs/solana-pay/blob/master/SPEC.md#label). */
  label?: Label;
  /** `message` in the [Solana Pay spec](https://github.com/solana-labs/solana-pay/blob/master/SPEC.md#message). */
  message?: Message;
  /** `memo` in the [Solana Pay spec](https://github.com/solana-labs/solana-pay/blob/master/SPEC.md#memo). */
  memo?: Memo;
}

/**
 * Fields of a Solana Pay transaction request URL.
 */
export interface TransactionRequestURLFields {
  /** `link` in the [Solana Pay spec](https://github.com/solana-labs/solana-pay/blob/master/SPEC.md#link). */
  link: Link;
  /** `label` in the [Solana Pay spec](https://github.com/solana-labs/solana-pay/blob/master/SPEC.md#label-1). */
  label?: Label;
  /** `message` in the [Solana Pay spec](https://github.com/solana-labs/solana-pay/blob/master/SPEC.md#message-1). */
  message?: Message;
}

/**
 * Convert bigint lamports to a decimal string without floating-point precision loss.
 */
function lamportsToDecimal(amount: bigint, decimals = SOL_DECIMALS): string {
  const neg = amount < 0n;
  const abs = neg ? -amount : amount;
  const base = 10n ** BigInt(decimals);
  const int = abs / base;
  const frac = abs % base;
  if (frac === 0n) return `${neg ? "-" : ""}${int}`;
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${neg ? "-" : ""}${int}.${fracStr}`;
}

/**
 * Encode a Solana Pay transfer or transaction request URL.
 */
export function encodeURL(fields: TransferRequestURLFields | TransactionRequestURLFields): URL {
  if ("link" in fields) {
    return encodeTransactionRequestURL(fields);
  }
  return encodeTransferRequestURL(fields);
}

/**
 * Encode a Solana Pay transfer request URL.
 */
export function encodeTransferRequestURL({
  recipient,
  amount,
  splToken,
  reference,
  label,
  message,
  memo,
}: TransferRequestURLFields): URL {
  const url = new URL(SOLANA_PROTOCOL + recipient.toString());

  if (amount !== undefined) {
    url.searchParams.append("amount", lamportsToDecimal(amount, SOL_DECIMALS));
  }

  if (splToken) {
    url.searchParams.append("spl-token", splToken.toString());
  }

  if (reference) {
    const references = Array.isArray(reference) ? reference : [reference];
    for (const ref of references) {
      url.searchParams.append("reference", ref.toString());
    }
  }

  if (label) {
    url.searchParams.append("label", label);
  }

  if (message) {
    url.searchParams.append("message", message);
  }

  if (memo) {
    url.searchParams.append("memo", memo);
  }

  return url;
}

/**
 * Encode a Solana Pay transaction request URL.
 */
export function encodeTransactionRequestURL({
  link,
  label,
  message,
}: TransactionRequestURLFields): URL {
  // Remove trailing slashes and normalize the `/?` boundary.
  const pathname = String(link).replace(/\/\?/, "?").replace(/\/$/, "");

  // Handle absolute and relative URLs.
  const url = pathname.startsWith("http") ? new URL(pathname) : new URL(SOLANA_PROTOCOL + pathname);

  if (url.protocol !== SOLANA_PROTOCOL && url.protocol !== HTTPS_PROTOCOL) {
    throw new Error("invalid link");
  }

  if (label) {
    url.searchParams.append("label", label);
  }

  if (message) {
    url.searchParams.append("message", message);
  }

  return url;
}
