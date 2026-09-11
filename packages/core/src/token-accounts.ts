import type { Connection, PublicKey } from "@vue-solana/core/web3";
import {
  type Account as TokenAccount,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  unpackAccount,
  unpackMint,
} from "@solana/spl-token";
import { normalizeSolanaError } from "./errors";

// ponytail: spl-token expects full @solana/web3.js types; compat PublicKey
// and Connection work at runtime but not structurally. Cast at boundaries.

export interface TokenAccountsByOwnerOptions {
  commitment?: "processed" | "confirmed" | "finalized";
  programId?: PublicKey;
}

/**
 * Get all SPL token accounts for an owner using the legacy `Connection` API.
 *
 * @deprecated Prefer `@solana-program/token` reads against `client.rpc` from
 * `@vue-solana/core/kit`.
 */
export async function getTokenAccountsByOwner(
  connection: Connection,
  owner: PublicKey,
  options?: TokenAccountsByOwnerOptions,
): Promise<TokenAccount[]> {
  const commitment = options?.commitment ?? "confirmed";
  const programId = options?.programId;

  const programIds = programId ? [programId] : [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID];

  try {
    const responses = await Promise.all(
      programIds.map(async (pid) => {
        const resp = await (
          connection as unknown as {
            getTokenAccountsByOwner: (
              owner: PublicKey,
              filter: { programId: PublicKey },
              commitment?: string,
            ) => Promise<{
              value: { pubkey: PublicKey; account: { data: Uint8Array } }[];
            }>;
          }
        ).getTokenAccountsByOwner(owner, { programId: pid }, commitment);
        return resp.value.map((info) =>
          unpackAccount(info.pubkey as never, { data: info.account.data } as never),
        );
      }),
    );

    return responses.flat();
  } catch (cause) {
    throw normalizeSolanaError(cause, "RPC_FAILURE");
  }
}

/**
 * Get a single token account using the legacy `Connection` API.
 *
 * @deprecated Prefer `@solana-program/token` reads against `client.rpc` from
 * `@vue-solana/core/kit`.
 */
export async function getTokenAccount(
  connection: Connection,
  address: PublicKey,
): Promise<TokenAccount | null> {
  try {
    const accountInfo = await connection.getAccountInfo(address);
    if (!accountInfo) {
      return null;
    }
    return unpackAccount(address as never, accountInfo as never);
  } catch (cause) {
    throw normalizeSolanaError(cause, "RPC_FAILURE");
  }
}

export interface TokenBalanceResult {
  amount: bigint;
  decimals: number;
}

/**
 * Read the token balance of the associated token account for an owner.
 *
 * @deprecated Prefer `@solana-program/token` reads against `client.rpc` from
 * `@vue-solana/core/kit`.
 */
export async function getTokenBalance(
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey,
): Promise<TokenBalanceResult | null> {
  try {
    const ata = getAssociatedTokenAddressSync(mint as never, owner as never, true);
    const accountInfo = await connection.getAccountInfo(ata);

    if (!accountInfo) {
      return null;
    }

    const tokenAccount = unpackAccount(ata as never, accountInfo as never);
    const mintAccountInfo = await connection.getAccountInfo(mint);

    if (!mintAccountInfo) {
      return null;
    }

    const mintAccount = unpackMint(mint as never, mintAccountInfo as never);
    return { amount: tokenAccount.amount, decimals: mintAccount.decimals };
  } catch (cause) {
    throw normalizeSolanaError(cause, "RPC_FAILURE");
  }
}
