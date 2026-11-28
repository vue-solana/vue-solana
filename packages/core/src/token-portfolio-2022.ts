import type { MaybeAddressInput } from "./address";
import { createSolanaError } from "./errors";
import type { SolanaClient } from "./kit";
import {
  getTokenPortfolio,
  type TokenPortfolioOptions,
  type TokenPortfolioResult,
} from "./token-portfolio";
import { TOKEN_2022_PROGRAM_ADDRESS } from "./token-accounts";

export { TOKEN_2022_PROGRAM_ADDRESS } from "./token-accounts";
export type {
  TokenPortfolioItem,
  TokenPortfolioMint,
  TokenPortfolioOptions,
  TokenPortfolioResult,
  TokenPortfolioTotals,
} from "./token-portfolio";

/** `programId` is fixed by this entry point and must not be supplied by callers. */
export type TokenPortfolio2022Options = Omit<TokenPortfolioOptions, "programId">;

/**
 * Read Token-2022 accounts for an owner. This is a separate entry point on
 * purpose: apps that only hold classic SPL accounts never load this program's
 * extension-aware path.
 *
 * The aggregation itself is the same read-only portfolio helper; only the
 * program filter changes. No zk or confidential-transfer code is involved.
 */
export async function getTokenPortfolio2022(
  client: SolanaClient,
  owner: MaybeAddressInput,
  options: TokenPortfolio2022Options = {},
): Promise<TokenPortfolioResult> {
  const rawOptions: unknown = options;

  if (typeof rawOptions !== "object" || rawOptions === null) {
    throw createSolanaError("INVALID_INPUT", "getTokenPortfolio2022: `options` must be an object.");
  }

  const { commitment, abortSignal } = rawOptions as TokenPortfolio2022Options;

  return getTokenPortfolio(client, owner, {
    commitment,
    abortSignal,
    programId: TOKEN_2022_PROGRAM_ADDRESS,
  });
}
