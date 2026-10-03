export function formatError(error: unknown) {
  if (!error) {
    return null;
  }

  return error instanceof Error ? error.message : String(error);
}
