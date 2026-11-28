import type { MaybeAddressInput } from "./address";
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
  options: TokenPortfolioOptions = {},
): Promise<TokenPortfolioResult> {
  return getTokenPortfolio(client, owner, { ...options, programId: TOKEN_2022_PROGRAM_ADDRESS });
}
