/**
 * Runtime counterpart of the module's build-time `toPublicSolanaConfig()`.
 *
 * The module already strips signer/wallet fields before writing
 * `runtimeConfig.public.solana`, but runtime config can be overridden after the
 * build, so both runtime plugins strip them again. Keeping the list here avoids
 * the two plugins drifting apart.
 */
export function toPublicPluginOptions(rawConfig: unknown): Record<string, unknown> {
  const options: Record<string, unknown> =
    typeof rawConfig === "object" && rawConfig !== null && !Array.isArray(rawConfig)
      ? { ...rawConfig }
      : {};

  delete options.wallet;
  delete options.payer;
  delete options.payerSecretKey;
  delete options.clientPlugin;

  return options;
}
