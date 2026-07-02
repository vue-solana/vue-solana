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
