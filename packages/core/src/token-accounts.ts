import type { Address, Commitment, JsonParsedTokenAccount } from "@solana/kit";
import { address } from "@solana/kit";
import type { SolanaClient } from "./kit";
import { normalizeSolanaError } from "./errors";

const TOKEN_PROGRAM_ADDRESS = address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const TOKEN_2022_PROGRAM_ADDRESS = address("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

export interface TokenAccountInfo {
  address: Address;
  mint: Address;
  owner: Address;
  amount: bigint;
  decimals: number;
  state: "frozen" | "initialized" | "uninitialized";
  isNative: boolean;
}

export interface TokenAccountsByOwnerOptions {
  commitment?: Commitment;
  programId?: Address;
}

/**
 * Get all SPL token accounts for an owner using parsed kit RPC reads.
 */
export async function getTokenAccountsByOwner(
  client: SolanaClient,
  owner: Address,
  options: TokenAccountsByOwnerOptions = {},
): Promise<TokenAccountInfo[]> {
  const programIds = options.programId
    ? [options.programId]
    : [TOKEN_PROGRAM_ADDRESS, TOKEN_2022_PROGRAM_ADDRESS];

  try {
    const results = await Promise.all(
      programIds.map((programId) =>
        fetchParsedTokenAccounts(client, owner, { programId }, options.commitment),
      ),
    );

    return results.flat();
  } catch (cause) {
    throw normalizeSolanaError(cause, "RPC_FAILURE");
  }
}

/**
 * Get a single parsed token account at the given address.
 */
export async function getTokenAccount(
  client: SolanaClient,
  address: Address,
  commitment?: Commitment,
): Promise<TokenAccountInfo | null> {
  try {
    const response = await client.rpc
      .getAccountInfo(address, { encoding: "jsonParsed", commitment })
      .send();
    const accountInfo = response.value;

    if (
      !accountInfo ||
      !isParsedTokenAccount(accountInfo.data) ||
      accountInfo.data.parsed.type !== "account"
    ) {
      return null;
    }

    return tokenAccountInfoFromParsed(address, accountInfo.data);
  } catch (cause) {
    throw normalizeSolanaError(cause, "RPC_FAILURE");
  }
}

export interface TokenBalanceResult {
  amount: bigint;
  decimals: number;
}

/**
 * Read the token balance of the accounts an owner holds for a given mint.
 */
export async function getTokenBalance(
  client: SolanaClient,
  mint: Address,
  owner: Address,
  commitment?: Commitment,
): Promise<TokenBalanceResult | null> {
  try {
    const [account] = await fetchParsedTokenAccounts(client, owner, { mint }, commitment);

    if (!account) {
      return null;
    }

    return { amount: account.amount, decimals: account.decimals };
  } catch (cause) {
    throw normalizeSolanaError(cause, "RPC_FAILURE");
  }
}

async function fetchParsedTokenAccounts(
  client: SolanaClient,
  owner: Address,
  filter: { mint: Address } | { programId: Address },
  commitment?: Commitment,
): Promise<TokenAccountInfo[]> {
  const response = await client.rpc
    .getTokenAccountsByOwner(owner, filter, { encoding: "jsonParsed", commitment })
    .send();

  return response.value
    .filter(({ account }) => isParsedTokenAccount(account.data))
    .map(({ pubkey, account }) => tokenAccountInfoFromParsed(pubkey, account.data));
}

type ParsedTokenAccountData = Readonly<{
  parsed: Readonly<{ info?: object; type: string }>;
  program: string;
  space: bigint;
}>;

function isParsedTokenAccount(data: unknown): data is ParsedTokenAccountData {
  return typeof data === "object" && data !== null && "parsed" in data;
}

function tokenAccountInfoFromParsed(
  address: Address,
  data: ParsedTokenAccountData,
): TokenAccountInfo {
  if (data.parsed.type !== "account") {
    throw new Error(`Token account ${address} is not a parsed token account`);
  }

  const parsed = data.parsed.info as JsonParsedTokenAccount | undefined;

  if (!parsed) {
    throw new Error(`Token account ${address} has no parsed data`);
  }

  return {
    address,
    mint: parsed.mint,
    owner: parsed.owner,
    amount: BigInt(parsed.tokenAmount.amount),
    decimals: parsed.tokenAmount.decimals,
    state: parsed.state,
    isNative: parsed.isNative,
  };
}
