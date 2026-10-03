import type { SolanaWallet } from "./types";
import { SolanaError } from "./errors";

export type SolanaWalletErrorCode =
  | "NO_WALLET_SELECTED"
  | "WALLET_NOT_CONNECTED"
  | "WALLET_FEATURE_UNSUPPORTED";

export class SolanaWalletError extends SolanaError {
  constructor(
    code: SolanaWalletErrorCode,
    message: string,
    options: { cause?: unknown; feature?: string } = {},
  ) {
    super(code, message, options);
    this.name = "SolanaWalletError";
  }
}

export function createNoWalletSelectedError(cause?: unknown): SolanaWalletError {
  return new SolanaWalletError("NO_WALLET_SELECTED", "No Solana wallet is selected", { cause });
}

export function isWalletConnected(
  wallet: Pick<SolanaWallet, "connected" | "publicKey"> | null | undefined,
): boolean {
  return Boolean(wallet?.connected && wallet.publicKey);
}

export function assertWalletConnected(
  wallet: SolanaWallet | null | undefined,
): asserts wallet is SolanaWallet & { publicKey: NonNullable<SolanaWallet["publicKey"]> } {
  if (!isWalletConnected(wallet)) {
    throw new SolanaWalletError("WALLET_NOT_CONNECTED", "Solana wallet is not connected");
  }
}

/**
 * `features` lists the wallet methods that satisfy the request; a wallet
 * exposing only one of them (for example `signAllTransactions` without
 * `signTransactions`) still passes. The first name is the reported feature.
 */
function assertWalletFeature(
  wallet: SolanaWallet | null | undefined,
  features: readonly WalletFeatureKey[],
  message: string,
): void {
  assertWalletConnected(wallet);

  if (!features.some((feature) => wallet[feature])) {
    throw new SolanaWalletError("WALLET_FEATURE_UNSUPPORTED", message, { feature: features[0] });
  }
}

type WalletFeatureKey =
  | "signTransaction"
  | "signTransactions"
  | "signAllTransactions"
  | "signAndSendTransaction"
  | "signAndSendTransactions"
  | "signMessage"
  | "signIn";

export function assertWalletCanSign(
  wallet: SolanaWallet | null | undefined,
): asserts wallet is SolanaWallet & Required<Pick<SolanaWallet, "signTransaction">> {
  assertWalletFeature(
    wallet,
    ["signTransaction"],
    "Solana wallet does not support signTransaction",
  );
}

export function assertWalletCanSignMessage(
  wallet: SolanaWallet | null | undefined,
): asserts wallet is SolanaWallet & Required<Pick<SolanaWallet, "signMessage">> {
  assertWalletFeature(wallet, ["signMessage"], "Solana wallet does not support signMessage");
}

export function assertWalletCanSignIn(
  wallet: SolanaWallet | null | undefined,
): asserts wallet is SolanaWallet & Required<Pick<SolanaWallet, "signIn">> {
  assertWalletFeature(
    wallet,
    ["signIn"],
    "Solana wallet does not support signIn (Sign In With Solana)",
  );
}

export function assertWalletCanSignTransactions(
  wallet: SolanaWallet | null | undefined,
): asserts wallet is SolanaWallet & Required<Pick<SolanaWallet, "signTransactions">> {
  assertWalletFeature(
    wallet,
    ["signTransactions", "signAllTransactions"],
    "Solana wallet does not support signTransactions",
  );
}

export function assertWalletCanSignAndSendTransactions(
  wallet: SolanaWallet | null | undefined,
): asserts wallet is SolanaWallet & Required<Pick<SolanaWallet, "signAndSendTransactions">> {
  assertWalletFeature(
    wallet,
    ["signAndSendTransactions", "signAndSendTransaction"],
    "Solana wallet does not support signAndSendTransactions",
  );
}
