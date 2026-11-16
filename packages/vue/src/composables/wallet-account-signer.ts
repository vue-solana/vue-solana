import { parseAddress } from "@vue-solana/core/address";
import { createSolanaError } from "@vue-solana/core/errors";
import type { Address } from "@vue-solana/core/kit";
import type { SolanaWallet, SolanaWalletInfo } from "@vue-solana/core/types";
import { assertWalletConnected, createNoWalletSelectedError } from "@vue-solana/core/wallet";
import { toValue, type MaybeRefOrGetter } from "vue";

/**
 * A wallet account, or the address of one. The object shape is the account
 * entry `useWallets()` and `useSelectedWalletAccount()` expose
 * (`{ address, publicKey, chains, label?, icon? }`), so its `{ value }` ref can
 * be passed straight in.
 */
export type WalletAccountReference =
  | SolanaWalletInfo["accounts"][number]
  | Address
  | string
  | null
  | undefined;

/**
 * A wallet account that may change over time. A ref or getter makes the signer
 * follow the account the app currently has selected, so a single signer
 * created in `setup()` survives an account switch.
 */
export type WalletAccountSource = MaybeRefOrGetter<WalletAccountReference>;

/**
 * Resolve the address a signer is expected to sign for.
 *
 * Throws `INVALID_INPUT` when the input is absent or not a valid Solana
 * address, and `INVALID_ADDRESS` (from `parseAddress()`) when a string is
 * malformed.
 */
export function resolveWalletAccountAddress(account: WalletAccountSource): Address {
  const value = toValue(account);
  const address = parseAddress(typeof value === "object" && value !== null ? value.address : value);

  if (!address) {
    throw createSolanaError(
      "INVALID_INPUT",
      "Wallet account signers need a wallet account or account address. Pass the account from useWallets()/useSelectedWalletAccount(), or its address.",
    );
  }

  return address;
}

/**
 * A wallet account signer can only sign through the connected wallet account,
 * because a wallet adapter always signs for the account it authorized. Reject
 * up front when the app built a signer for another account: letting the
 * request through would return a signature for the wrong key.
 */
export function getAccountSigningWallet(
  wallet: SolanaWallet | null | undefined,
  address: Address,
): SolanaWallet {
  if (!wallet) {
    throw createNoWalletSelectedError();
  }

  assertWalletConnected(wallet);

  if (wallet.publicKey !== address) {
    throw createSolanaError(
      "INVALID_INPUT",
      `This signer signs for ${address}, but the connected wallet account is ${wallet.publicKey}. Connect the wallet that owns ${address} before signing.`,
    );
  }

  return wallet;
}

/**
 * Wallets identify chains with a `solana:` prefix (`solana:mainnet`,
 * `solana:devnet`, …). Reject anything else at signer creation so a typo
 * cannot surface later as an unexplained wallet error.
 */
export function assertSolanaChain(chain: string): void {
  if (!chain.startsWith("solana:")) {
    throw createSolanaError(
      "INVALID_INPUT",
      `Wallet account signers need a Solana chain identifier such as "solana:devnet"; received "${chain}".`,
    );
  }
}
