export type SolanaErrorCode =
  | "NO_WALLET_SELECTED"
  | "WALLET_NOT_CONNECTED"
  | "WALLET_FEATURE_UNSUPPORTED"
  | "USER_REJECTED"
  | "INVALID_ADDRESS"
  | "TRANSACTION_TIMEOUT"
  | "RPC_FAILURE"
  | "STORAGE_FAILURE";

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
  return error instanceof SolanaError;
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
