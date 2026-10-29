import { address } from "@solana/kit";
import { SOLANA_PROTOCOL, HTTPS_PROTOCOL, SOL_DECIMALS } from "./constants";
import type { TransferRequestURLFields, TransactionRequestURLFields } from "./encode-url";

/**
 * Error thrown when a URL can't be parsed as a Solana Pay URL.
 */
export class ParseURLError extends Error {
  name = "ParseURLError";
}

/**
 * Convert a decimal string to atomic units (bigint) without floating-point math.
 */
function toAtomicUnits(amount: string, decimals: number): bigint {
  if (!amount || !amount.trim()) {
    throw new ParseURLError("amount invalid");
  }

  const trimmed = amount.trim();

  if (trimmed.startsWith("-")) {
    throw new ParseURLError("amount invalid");
  }

  const [integerPart = "0", fractionalPart = ""] = trimmed.split(".");

  if ((integerPart === "" || integerPart === "0") && fractionalPart === "") {
    throw new ParseURLError("amount invalid");
  }

  if (fractionalPart.length > decimals) {
    throw new ParseURLError("amount decimals invalid");
  }

  const paddedFractional = fractionalPart.padEnd(decimals, "0");
  const integerLamports = BigInt(integerPart || "0") * 10n ** BigInt(decimals);
  const fractionalLamports = BigInt(paddedFractional || "0");

  return integerLamports + fractionalLamports;
}

/**
 * Parse a Solana Pay URL.
 *
 * @throws {ParseURLError} when the URL is not a valid Solana Pay URL.
 */
export function parseURL(
  url: string | URL,
): TransferRequestURLFields | TransactionRequestURLFields {
  if (typeof url === "string") {
    if (url.length > 2048) throw new ParseURLError("length invalid");
    url = new URL(url);
  }

  if (url.protocol !== SOLANA_PROTOCOL) throw new ParseURLError("protocol invalid");

  if (!url.pathname) throw new ParseURLError("pathname missing");

  if (/^https?:\/\//.test(url.pathname)) {
    return parseTransactionRequestURL(url);
  }

  return parseTransferRequestURL(url);
}

function parseTransferRequestURL(url: URL): TransferRequestURLFields {
  const { pathname, searchParams } = url;

  let recipient;
  try {
    recipient = address(pathname);
  } catch {
    throw new ParseURLError("recipient invalid");
  }

  let amount;
  const amountParam = searchParams.get("amount");
  if (amountParam != null) {
    if (!/^\d+(\.\d+)?$/.test(amountParam)) throw new ParseURLError("amount invalid");
    if (Number.isNaN(Number.parseFloat(amountParam))) throw new ParseURLError("amount invalid");
    amount = toAtomicUnits(amountParam, SOL_DECIMALS);
  }

  let splToken;
  const splTokenParam = searchParams.get("spl-token");
  if (splTokenParam != null) {
    try {
      splToken = address(splTokenParam);
    } catch {
      throw new ParseURLError("token invalid");
    }
  }

  const referenceParams = searchParams.getAll("reference");
  let reference;
  if (referenceParams.length) {
    try {
      reference = referenceParams.map((param) => address(param));
    } catch {
      throw new ParseURLError("reference invalid");
    }
  }

  const label = searchParams.get("label") || undefined;
  const message = searchParams.get("message") || undefined;
  const memo = searchParams.get("memo") || undefined;

  return {
    recipient,
    amount,
    splToken,
    reference,
    label,
    message,
    memo,
  };
}

function parseTransactionRequestURL(url: URL): TransactionRequestURLFields {
  let link;
  try {
    // Strip the leading "//" that the `solana:` protocol adds to the pathname.
    const linkParam = url.pathname.slice(2);
    link = new URL(decodeURIComponent(linkParam) + url.search);
    if (link.protocol !== HTTPS_PROTOCOL) throw new ParseURLError("link invalid");
  } catch {
    throw new ParseURLError("link invalid");
  }

  const label = url.searchParams.get("label") || undefined;
  const message = url.searchParams.get("message") || undefined;

  return {
    link,
    label,
    message,
  };
}
