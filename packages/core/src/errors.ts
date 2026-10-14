export type SolanaErrorCode =
  | "NO_WALLET_SELECTED"
  | "WALLET_NOT_CONNECTED"
  | "WALLET_FEATURE_UNSUPPORTED"
  | "USER_REJECTED"
  | "INVALID_ADDRESS"
  | "TRANSACTION_TIMEOUT"
  | "TRANSACTION_NOT_FOUND"
  | "TRANSACTION_FAILED"
  | "RPC_FAILURE"
  // Shared cross-package code: core never throws it (core stays DOM-free),
  // but `@vue-solana/vue`'s selected-wallet `localStorage` persistence does.
  // It lives here so every package answers `isSolanaError()` for it and the
  // code vocabulary stays in one place.
  | "STORAGE_FAILURE"
  | "INVALID_INPUT"
  | "DECRYPTION_FAILED"
  | "REDIRECT_TIMEOUT"
  | "MISSING_CLIENT_CAPABILITY";

export interface SolanaErrorOptions {
  cause?: unknown;
  feature?: string;
}

export class SolanaError extends Error {
  public readonly cause?: unknown;
  public readonly feature?: string;

  constructor(
    public readonly code: SolanaErrorCode,
    message: string,
    options: SolanaErrorOptions = {},
  ) {
    super(message);
    this.name = "SolanaError";
    this.cause = options.cause;
    this.feature = options.feature;
  }
}

export function createSolanaError(
  code: SolanaErrorCode,
  message: string,
  options?: SolanaErrorOptions,
): SolanaError {
  return new SolanaError(code, message, options);
}

export function isSolanaError(error: unknown): error is SolanaError {
  if (error instanceof SolanaError) {
    return true;
  }

  // Duplicate package copies mean `instanceof` can fail: two copies of
  // `@vue-solana/core` ship two `SolanaError` classes. Fall back to a
  // structural check. Kit's own `SolanaError` also uses
  // `name === "SolanaError"` but carries a numeric `code`, so require a
  // string `code` to avoid misclassifying Kit errors. `SolanaWalletError`
  // extends this class (renaming to `"SolanaWalletError"`) and stays a
  // `SolanaError` across copies too.
  return (
    typeof error === "object" &&
    error !== null &&
    ((error as { name?: unknown }).name === "SolanaError" ||
      (error as { name?: unknown }).name === "SolanaWalletError" ||
      (error as { name?: unknown }).name === "MissingClientCapabilityError" ||
      (error as { name?: unknown }).name === "PartialSignAndSendError") &&
    typeof (error as { code?: unknown }).code === "string"
  );
}

export function normalizeSolanaError(
  cause: unknown,
  fallbackCode: SolanaErrorCode,
  fallbackMessage?: string,
  options: Omit<SolanaErrorOptions, "cause"> = {},
): SolanaError {
  if (isSolanaError(cause)) {
    return cause;
  }

  const code = isUserRejectedError(cause) ? "USER_REJECTED" : fallbackCode;
  const message = fallbackMessage ?? getErrorMessage(cause);

  return createSolanaError(code, message, { ...options, cause });
}

function getErrorMessage(cause: unknown): string {
  if (cause instanceof Error) {
    return cause.message;
  }

  return typeof cause === "string" ? cause : "An unknown Solana error occurred";
}

function isUserRejectedError(cause: unknown): boolean {
  if (hasErrorCode(cause) && (cause.code === 4001 || cause.code === "4001")) {
    return true;
  }

  const message = getErrorMessage(cause).toLowerCase();

  return message.includes("user rejected") || message.includes("user denied");
}

function hasErrorCode(cause: unknown): cause is { code: number | string } {
  return Boolean(
    cause &&
    typeof cause === "object" &&
    "code" in cause &&
    (typeof cause.code === "number" || typeof cause.code === "string"),
  );
}
