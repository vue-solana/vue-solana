import type { Connection, TransactionSignature } from "@solana/web3-compat";
import { assertWalletCanSign, assertWalletConnected } from "./wallet";
import type { SendTransactionOptions, SolanaTransaction, SolanaWallet } from "./types";

export async function signAndSendTransaction(
  connection: Connection,
  wallet: SolanaWallet,
  transaction: SolanaTransaction,
  options?: SendTransactionOptions,
): Promise<TransactionSignature> {
  assertWalletConnected(wallet);

  if (isMobileWalletAdapterWallet(wallet) && wallet.signTransaction) {
    assertWalletCanSign(wallet);
    return signAndSendRawTransaction(connection, wallet, transaction, options);
  }

  if (wallet.signAndSendTransaction) {
    const result = await wallet.signAndSendTransaction(transaction, options);
    return result.signature;
  }

  assertWalletCanSign(wallet);

  return signAndSendRawTransaction(connection, wallet, transaction, options);
}

async function signAndSendRawTransaction(
  connection: Connection,
  wallet: SolanaWallet & Required<Pick<SolanaWallet, "signTransaction">>,
  transaction: SolanaTransaction,
  options?: SendTransactionOptions,
): Promise<TransactionSignature> {
  const signedTransaction = await wallet.signTransaction(transaction);
  const rawTransaction = signedTransaction.serialize();

  return connection.sendRawTransaction(rawTransaction, options);
}

function isMobileWalletAdapterWallet(wallet: SolanaWallet): boolean {
  return wallet.source === "mobile-wallet-adapter";
}
