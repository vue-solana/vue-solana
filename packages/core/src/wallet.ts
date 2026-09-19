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

export function assertWalletCanSign(
  wallet: SolanaWallet | null | undefined,
): asserts wallet is SolanaWallet & Required<Pick<SolanaWallet, "signTransaction">> {
  assertWalletConnected(wallet);

  if (!wallet.signTransaction) {
    throw new SolanaWalletError(
      "WALLET_FEATURE_UNSUPPORTED",
      "Solana wallet does not support signTransaction",
      { feature: "signTransaction" },
    );
  }
}

export function assertWalletCanSignMessage(
  wallet: SolanaWallet | null | undefined,
): asserts wallet is SolanaWallet & Required<Pick<SolanaWallet, "signMessage">> {
  assertWalletConnected(wallet);

  if (!wallet.signMessage) {
    throw new SolanaWalletError(
      "WALLET_FEATURE_UNSUPPORTED",
      "Solana wallet does not support signMessage",
      { feature: "signMessage" },
    );
  }
}

export function assertWalletCanSignIn(
  wallet: SolanaWallet | null | undefined,
): asserts wallet is SolanaWallet & Required<Pick<SolanaWallet, "signIn">> {
  assertWalletConnected(wallet);

  if (!wallet.signIn) {
    throw new SolanaWalletError(
      "WALLET_FEATURE_UNSUPPORTED",
      "Solana wallet does not support signIn (Sign In With Solana)",
      { feature: "signIn" },
    );
  }
}

export function assertWalletCanSignTransactions(
  wallet: SolanaWallet | null | undefined,
): asserts wallet is SolanaWallet & Required<Pick<SolanaWallet, "signTransactions">> {
  assertWalletConnected(wallet);

  if (!wallet.signTransactions && !wallet.signAllTransactions) {
    throw new SolanaWalletError(
      "WALLET_FEATURE_UNSUPPORTED",
      "Solana wallet does not support signTransactions",
      { feature: "signTransactions" },
    );
  }
}

export function assertWalletCanSignAndSendTransactions(
  wallet: SolanaWallet | null | undefined,
): asserts wallet is SolanaWallet & Required<Pick<SolanaWallet, "signAndSendTransactions">> {
  assertWalletConnected(wallet);

  if (!wallet.signAndSendTransactions && !wallet.signAndSendTransaction) {
    throw new SolanaWalletError(
      "WALLET_FEATURE_UNSUPPORTED",
      "Solana wallet does not support signAndSendTransactions",
      { feature: "signAndSendTransactions" },
    );
  }
}
