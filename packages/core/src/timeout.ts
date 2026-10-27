import { createSolanaError, type SolanaErrorCode } from "./errors";

export interface WithTimeoutOptions {
  /**
   * Rejects without racing when the caller's own `AbortSignal` fires first.
   * An aborted wait rejects with the signal's reason (an `AbortError` by
   * default) rather than the timeout error.
   */
  signal?: AbortSignal;
  /**
   * Error code for the timeout rejection when `createError` is not given.
   * Defaults to `"TRANSACTION_TIMEOUT"`.
   */
  code?: SolanaErrorCode;
  /**
   * Message for the timeout rejection when `createError` is not given.
   */
  message?: string;
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number | undefined,
  createError?: () => unknown,
  options?: WithTimeoutOptions,
): Promise<T>;
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number | undefined,
  options?: WithTimeoutOptions,
): Promise<T>;
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number | undefined,
  createErrorOrOptions?: (() => unknown) | WithTimeoutOptions,
  maybeOptions?: WithTimeoutOptions,
): Promise<T> {
  const createError = typeof createErrorOrOptions === "function" ? createErrorOrOptions : undefined;
  const {
    signal,
    code = "TRANSACTION_TIMEOUT",
    message,
  } = (typeof createErrorOrOptions === "function" ? maybeOptions : createErrorOrOptions) ?? {};

  if (timeoutMs === undefined) {
    return signal ? raceWithSignal(promise, signal) : promise;
  }

  if (typeof timeoutMs !== "number" || Number.isNaN(timeoutMs) || timeoutMs < 0) {
    throw createSolanaError(
      "INVALID_INPUT",
      `Invalid timeout: expected a non-negative number of milliseconds, received ${String(timeoutMs)}`,
    );
  }

  signal?.throwIfAborted();

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    // ponytail: the try/catch looks redundant but is not. `createError()` runs
    // in the `setTimeout` callback, not the executor body, so a throwing
    // factory would be an uncaught exception rather than a rejection.
    timeoutId = setTimeout(() => {
      try {
        reject(createError?.() ?? createSolanaError(code, message ?? "Operation timed out"));
      } catch (error) {
        reject(error);
      }
    }, timeoutMs);

    if (signal) {
      onAbort = () => reject(signal.reason);
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });

  const raced = signal ? raceWithSignal(promise, signal) : promise;

  return Promise.race([raced, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (signal && onAbort) {
      signal.removeEventListener("abort", onAbort);
    }
  });
}

function raceWithSignal<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(signal.reason);
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (cause) => {
        signal.removeEventListener("abort", onAbort);
        reject(cause);
      },
    );
  });
}

export function withSolanaTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number | undefined,
  message: string,
): Promise<T> {
  return withTimeout(promise, timeoutMs, () => createSolanaError("TRANSACTION_TIMEOUT", message));
}
