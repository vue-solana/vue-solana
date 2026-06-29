export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number | undefined,
  message: string,
): Promise<T> {
  if (!timeoutMs) {
    return promise;
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(message));
      }, timeoutMs);
    });

    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
