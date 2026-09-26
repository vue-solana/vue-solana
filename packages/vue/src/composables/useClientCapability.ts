import { useSolanaClient } from "./useSolanaClient";

/**
 * Thrown by {@link useClientCapability} when the installed Solana client does
 * not expose a requested capability.
 */
export class MissingClientCapabilityError extends Error {
  /** Name of the hook that requested the capability, e.g. `usePayer`. */
  public readonly hookName: string;
  /** Human guidance for installing the capability on the client. */
  public readonly providerHint: string;
  /** The missing capability name(s). */
  public readonly capabilities: readonly string[];

  constructor(hookName: string, capabilities: readonly string[], providerHint: string) {
    super(
      `${hookName} requires the ${capabilities.map((capability) => `\`${capability}\``).join(" and ")} ` +
        `capabilit${capabilities.length === 1 ? "y" : "ies"} on the Solana client, but none ${capabilities.length === 1 ? "was" : "were"} found. ` +
        providerHint,
    );
    this.name = "MissingClientCapabilityError";
    this.hookName = hookName;
    this.capabilities = capabilities;
    this.providerHint = providerHint;
  }
}

export interface UseClientCapabilityOptions {
  /**
   * Name of the calling hook for error messages (defaults to
   * `useClientCapability`).
   */
  hookName?: string;
  /**
   * Guidance appended to the error when a capability is missing, e.g. which
   * `@solana/kit` plugin to `.use()`.
   */
  providerHint?: string;
}

/**
 * Runtime assertion that a capability is installed on the (loosely-typed)
 * Solana client. Throws a {@link MissingClientCapabilityError} — naming the
 * calling hook and how to install the capability — if any requested
 * capability is missing. Accepts one capability name or an array.
 *
 * The assertion runs synchronously during setup (the first step of mount),
 * so a misconfigured client fails fast with a clear error instead of a
 * cryptic `undefined is not a function` later on.
 */
export function useClientCapability(
  capability: string | readonly string[],
  options: UseClientCapabilityOptions = {},
): void {
  const capabilities = Array.isArray(capability) ? [...capability] : [capability];
  const hookName = options.hookName ?? "useClientCapability";
  const providerHint =
    options.providerHint ??
    "Install it by adding the corresponding @solana/kit plugin with `createClient().use(...)`.";

  const { client } = useSolanaClient();

  for (const name of capabilities) {
    const value = (client as Record<string, unknown>)[name];

    if (typeof value !== "function" && typeof value !== "object") {
      throw new MissingClientCapabilityError(hookName, [name], providerHint);
    }
  }
}
