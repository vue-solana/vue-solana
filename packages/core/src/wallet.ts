import type { SolanaWallet } from "./types";

export function isWalletConnected(
  wallet: Pick<SolanaWallet, "connected" | "publicKey"> | null | undefined,
): boolean {
  return Boolean(wallet?.connected && wallet.publicKey);
}

export function assertWalletConnected(
  wallet: SolanaWallet | null | undefined,
): asserts wallet is SolanaWallet & { publicKey: NonNullable<SolanaWallet["publicKey"]> } {
  if (!isWalletConnected(wallet)) {
    throw new Error("Solana wallet is not connected");
  }
}

export function assertWalletCanSign(
  wallet: SolanaWallet | null | undefined,
): asserts wallet is SolanaWallet & Required<Pick<SolanaWallet, "signTransaction">> {
  assertWalletConnected(wallet);

  if (!wallet.signTransaction) {
    throw new Error("Solana wallet does not support signTransaction");
  }
}
