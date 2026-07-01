import type { SolanaWallet } from "./types";

export type SolanaWalletErrorCode =
  | "WALLET_NOT_CONNECTED"
  | "WALLET_SIGN_MESSAGE_UNSUPPORTED"
  | "WALLET_SIGN_TRANSACTION_UNSUPPORTED";

export class SolanaWalletError extends Error {
  constructor(
    public readonly code: SolanaWalletErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SolanaWalletError";
  }
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
      "WALLET_SIGN_TRANSACTION_UNSUPPORTED",
      "Solana wallet does not support signTransaction",
    );
  }
}

export function assertWalletCanSignMessage(
  wallet: SolanaWallet | null | undefined,
): asserts wallet is SolanaWallet & Required<Pick<SolanaWallet, "signMessage">> {
  assertWalletConnected(wallet);

  if (!wallet.signMessage) {
    throw new SolanaWalletError(
      "WALLET_SIGN_MESSAGE_UNSUPPORTED",
      "Solana wallet does not support signMessage",
    );
  }
}
