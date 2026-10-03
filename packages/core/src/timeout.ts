import { createSolanaError } from "./errors";

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number | undefined,
  createError: () => unknown,
): Promise<T> {
  if (timeoutMs === undefined) {
    return promise;
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  return Promise.race([
    promise,
    // ponytail: the try/catch looks redundant but is not. `createError()` runs
    // in the `setTimeout` callback, not the executor body, so a throwing
    // factory would be an uncaught exception rather than a rejection.
    new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        try {
          reject(createError());
        } catch (error) {
          reject(error);
        }
      }, timeoutMs);
    }),
  ]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

export function withSolanaTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number | undefined,
  message: string,
): Promise<T> {
  return withTimeout(promise, timeoutMs, () => createSolanaError("TRANSACTION_TIMEOUT", message));
}
