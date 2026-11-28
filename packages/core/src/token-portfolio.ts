import type { Address, Commitment } from "@solana/kit";
import { parseAddress, type MaybeAddressInput } from "./address";
import { createSolanaError, normalizeSolanaError } from "./errors";
import type { SolanaClient } from "./kit";
import {
  getTokenAccountsByOwner,
  TOKEN_2022_PROGRAM_ADDRESS,
  TOKEN_PROGRAM_ADDRESS,
  type TokenAccountInfo,
} from "./token-accounts";

/** Kit's `getMultipleAccounts` accepts at most 100 addresses per request. */
const MAX_MINTS_PER_REQUEST = 100;

export interface TokenPortfolioOptions {
  commitment?: Commitment;
  abortSignal?: AbortSignal;
  /**
   * Program to read token accounts from. Defaults to the classic SPL Token
   * program; Token-2022 accounts are opt-in through
   * `@vue-solana/core/token-portfolio-2022`.
   */
  programId?: Address;
}

export interface TokenPortfolioItem extends TokenAccountInfo {
  /** `amount` scaled by `decimals`, or `null` when it is not a finite JS number. */
  uiAmount: number | null;
  /** Whether `decimals` came from the mint account or the token account. */
  decimalsSource: "mint" | "account";
}

export interface TokenPortfolioMint {
  mint: Address;
  decimals: number;
  amount: bigint;
  uiAmount: number | null;
  accounts: TokenPortfolioItem[];
}

export interface TokenPortfolioTotals {
  accounts: number;
  mints: number;
}

export interface TokenPortfolioResult {
  owner: Address;
  programId: Address;
  accounts: TokenPortfolioItem[];
  byMint: Record<string, TokenPortfolioMint>;
  totals: TokenPortfolioTotals;
  /**
   * Mints with no usable parsed mint account. Their decimals fall back to the
   * value the RPC reported on each token account, so balances stay readable.
   */
  unresolvedMints: Address[];
}

/**
 * Aggregate an owner's token accounts into a read-only portfolio.
 *
 * Account parsing is reused from `./token-accounts`; mint decimals are a
 * supplementary `jsonParsed` read and never required for a balance to be
 * returned. This helper does not fetch prices or metadata, and it never signs
 * or sends a transaction.
 */
export async function getTokenPortfolio(
  client: SolanaClient,
  owner: MaybeAddressInput,
  options: TokenPortfolioOptions = {},
): Promise<TokenPortfolioResult> {
  const rawOptions: unknown = options;

  if (typeof rawOptions !== "object" || rawOptions === null) {
    throw createSolanaError("INVALID_INPUT", "getTokenPortfolio: `options` must be an object.");
  }

  const {
    commitment,
    abortSignal,
    programId = TOKEN_PROGRAM_ADDRESS,
  } = rawOptions as TokenPortfolioOptions;
  abortSignal?.throwIfAborted();

  const parsedOwner = parseAddress(owner);

  if (!parsedOwner) {
    throw createSolanaError("INVALID_ADDRESS", "getTokenPortfolio: an owner address is required.");
  }

  try {
    // The existing helper parses every account; it already applies the program
    // filter and forwards the abort signal to the RPC.
    const accounts = await getTokenAccountsByOwner(client, parsedOwner, {
      commitment,
      programId,
      abortSignal,
    });
    const mints = [...new Set(accounts.map((account) => account.mint))];
    const { decimalsByMint, unresolvedMints } = await resolveMintDecimals(
      client,
      mints,
      commitment,
      abortSignal,
    );

    const byMint: Record<string, TokenPortfolioMint> = {};
    const items = accounts.map((account): TokenPortfolioItem => {
      const mintDecimals = decimalsByMint.get(account.mint);
      const decimals = mintDecimals ?? account.decimals;
      const item: TokenPortfolioItem = {
        ...account,
        decimals,
        decimalsSource: mintDecimals === undefined ? "account" : "mint",
        uiAmount: toUiAmount(account.amount, decimals),
      };

      const existing = byMint[account.mint];

      if (existing) {
        existing.amount += item.amount;
        existing.uiAmount = toUiAmount(existing.amount, existing.decimals);
        existing.accounts.push(item);
      } else {
        byMint[account.mint] = {
          mint: account.mint,
          decimals,
          amount: item.amount,
          uiAmount: item.uiAmount,
          accounts: [item],
        };
      }

      return item;
    });

    return {
      owner: parsedOwner,
      programId,
      accounts: items,
      byMint,
      totals: { accounts: items.length, mints: Object.keys(byMint).length },
      unresolvedMints,
    };
  } catch (cause) {
    if (abortSignal?.aborted) {
      throw abortSignal.reason ?? cause;
    }

    throw normalizeSolanaError(cause, "RPC_FAILURE");
  }
}

interface MintDecimalsResult {
  decimalsByMint: Map<string, number>;
  unresolvedMints: Address[];
}

async function resolveMintDecimals(
  client: SolanaClient,
  mints: readonly Address[],
  commitment: Commitment | undefined,
  abortSignal: AbortSignal | undefined,
): Promise<MintDecimalsResult> {
  const decimalsByMint = new Map<string, number>();
  const unresolvedMints: Address[] = [];

  if (mints.length === 0) {
    return { decimalsByMint, unresolvedMints };
  }

  if (typeof client.rpc?.getMultipleAccounts !== "function") {
    throw createSolanaError(
      "MISSING_CLIENT_CAPABILITY",
      "getTokenPortfolio: `rpc.getMultipleAccounts` is required to resolve mint decimals.",
      { feature: "rpc.getMultipleAccounts" },
    );
  }

  for (let offset = 0; offset < mints.length; offset += MAX_MINTS_PER_REQUEST) {
    const batch = mints.slice(offset, offset + MAX_MINTS_PER_REQUEST);
    const response = await client.rpc
      .getMultipleAccounts(batch, { encoding: "jsonParsed", commitment })
      .send({ abortSignal });

    batch.forEach((mint, index) => {
      const decimals = parseMintDecimals(response.value[index]);

      if (decimals === null) {
        unresolvedMints.push(mint);
      } else {
        decimalsByMint.set(mint, decimals);
      }
    });
  }

  return { decimalsByMint, unresolvedMints };
}

/**
 * `getMultipleAccounts` returns null for missing accounts and a union of
 * parsed account shapes; only a parsed `mint` with a sane `decimals` field is
 * usable. Everything else is an untrusted payload and is reported as
 * unresolved rather than guessed at.
 */
function parseMintDecimals(account: unknown): number | null {
  if (typeof account !== "object" || account === null || !("data" in account)) {
    return null;
  }

  // A `jsonParsed` account is still an untrusted payload. Require a token
  // program owner before letting its decimals scale every balance for a mint.
  if (!("owner" in account) || !isTokenProgramAddress((account as { owner?: unknown }).owner)) {
    return null;
  }

  const data = (account as { data?: unknown }).data;

  if (typeof data !== "object" || data === null || !("parsed" in data)) {
    return null;
  }

  const program = (data as { program?: unknown }).program;

  if (program !== "spl-token" && program !== "spl-token-2022") {
    return null;
  }

  const parsed = (data as { parsed?: unknown }).parsed;

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("type" in parsed) ||
    (parsed as { type?: unknown }).type !== "mint" ||
    !("info" in parsed)
  ) {
    return null;
  }

  const info = (parsed as { info?: unknown }).info;

  if (typeof info !== "object" || info === null || !("decimals" in info)) {
    return null;
  }

  const decimals = (info as { decimals?: unknown }).decimals;

  return typeof decimals === "number" &&
    Number.isInteger(decimals) &&
    decimals >= 0 &&
    decimals <= 255
    ? decimals
    : null;
}

function isTokenProgramAddress(owner: unknown): boolean {
  return owner === TOKEN_PROGRAM_ADDRESS || owner === TOKEN_2022_PROGRAM_ADDRESS;
}

function toUiAmount(amount: bigint, decimals: number): number | null {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
    return null;
  }

  // Divide in bigint space first: converting a large raw balance to `number`
  // before scaling silently rounds off digits that still fit in the UI amount.
  const scale = 10n ** BigInt(decimals);
  const whole = Number(amount / scale);
  const fraction = Number(amount % scale) / Number(scale);
  const value = whole + fraction;

  return Number.isFinite(value) ? value : null;
}
