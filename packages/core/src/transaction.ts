import type { Connection, TransactionSignature } from "@solana/web3-compat";
import { assertWalletCanSign, assertWalletConnected } from "./wallet";
import type {
  ConfirmTransactionOptions,
  SendTransactionOptions,
  SolanaTransaction,
  SolanaWallet,
  TransactionConfirmation,
} from "./types";

const DEFAULT_CONFIRMATION_COMMITMENT = "confirmed";
const DEFAULT_CONFIRMATION_TIMEOUT_MS = 60_000;

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

export async function confirmTransactionSignature(
  connection: Connection,
  signature: TransactionSignature,
  options: ConfirmTransactionOptions = {},
): Promise<TransactionConfirmation> {
  const commitment = options.commitment ?? DEFAULT_CONFIRMATION_COMMITMENT;
  const confirmation = connection.confirmTransaction(signature, commitment) as Promise<
    TransactionConfirmation["result"]
  >;
  const result = await withTransactionTimeout(
    confirmation,
    options.timeoutMs ?? DEFAULT_CONFIRMATION_TIMEOUT_MS,
    `Timed out waiting for transaction ${signature} to reach ${commitment} commitment.`,
  );

  if (result.value.err) {
    throw new Error(`Transaction ${signature} failed to reach ${commitment} commitment.`);
  }

  return {
    signature,
    commitment,
    result,
  };
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

async function withTransactionTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(message));
      }, timeoutMs);
    });

    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
