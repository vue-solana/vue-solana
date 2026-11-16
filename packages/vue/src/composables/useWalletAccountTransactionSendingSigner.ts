import {
  createSolanaError,
  normalizeSolanaError,
  PartialSignAndSendError,
} from "@vue-solana/core/errors";
import {
  getBase58Encoder,
  getTransactionEncoder,
  type Signature,
  type SignatureBytes,
  type TransactionSendingSigner,
} from "@vue-solana/core/kit";
import { withTimeout } from "@vue-solana/core/timeout";
import type {
  SendTransactionOptions,
  SolanaTransaction,
  SolanaWallet,
} from "@vue-solana/core/types";
import { assertWalletCanSignAndSendTransactions } from "@vue-solana/core/wallet";
import { useWallet } from "./useWallet";
import {
  assertSolanaChain,
  assertWalletAccountSupportsChain,
  getAccountSigningWallet,
  resolveWalletAccountAddress,
  type WalletAccountSource,
} from "./wallet-account-signer";

const SEND_TIMEOUT_MS = 120_000;
const SEND_TIMEOUT_MESSAGE =
  "Wallet transaction did not return a result. Check your wallet or explorer for the final status.";

function toSignatureBytes(signature: Signature): SignatureBytes {
  let bytes: Uint8Array;

  try {
    bytes = new Uint8Array(getBase58Encoder().encode(signature) as Uint8Array);
  } catch (cause) {
    throw createSolanaError("WALLET_FAILURE", "Wallet returned an invalid transaction signature", {
      cause,
    });
  }

  if (bytes.length !== 64) {
    throw createSolanaError(
      "WALLET_FAILURE",
      `Wallet returned a transaction signature with an unexpected length (${bytes.length})`,
    );
  }

  return bytes as unknown as SignatureBytes;
}

/**
 * A Kit {@link TransactionSendingSigner} backed by a wallet account: the
 * wallet signs and submits the transaction itself, and the signer resolves
 * with the resulting signature bytes.
 *
 * Use it where Kit wants a sending signer — `signAndSendTransactionMessageWithSigners()`,
 * or as a fee payer that must pay and send in one wallet visit. Use
 * `useWalletAccountTransactionSigner()` instead when the app submits the
 * signed bytes through its own RPC.
 *
 * The wallet must expose a sign-and-send capability; a wallet that only signs
 * fails with `WALLET_FEATURE_UNSUPPORTED`. For one transaction it prefers the
 * singular `signAndSendTransaction` request when available, otherwise it uses
 * the batch request, or falls back to one singular request per transaction in
 * sequence. A fallback that fails partway rejects with
 * `PartialSignAndSendError` carrying the signatures that already landed, and the
 * request times out after 120 seconds with `TRANSACTION_TIMEOUT`.
 *
 * The account is resolved at call time, so a ref or getter follows the current
 * selection. `chain` must be a
 * Solana chain identifier (`solana:mainnet`, `solana:devnet`, …); the adapter
 * already selected a chain when the wallet was adapted, so it is validated
 * rather than forwarded with the request. When the account is passed as an
 * object that declares `chains`, the signer also rejects a chain the account
 * does not support.
 *
 * ```ts
 * import { useWalletAccountTransactionSendingSigner } from "@vue-solana/vue/useWalletAccountTransactionSendingSigner";
 *
 * const [selectedAccount] = useSelectedWalletAccount();
 * const signer = useWalletAccountTransactionSendingSigner(selectedAccount, "solana:devnet");
 * const [signature] = await signer.signAndSendTransactions([transaction]);
 * ```
 */
export function useWalletAccountTransactionSendingSigner(
  account: WalletAccountSource,
  chain: string,
): TransactionSendingSigner {
  assertSolanaChain(chain);

  const { wallet } = useWallet();

  return {
    get address() {
      return resolveWalletAccountAddress(account);
    },
    async signAndSendTransactions(transactions, config) {
      config?.abortSignal?.throwIfAborted();

      assertWalletAccountSupportsChain(account, chain);
      const address = resolveWalletAccountAddress(account);

      if (transactions.length === 0) {
        return [];
      }

      const activeWallet = getAccountSigningWallet(wallet.value, address);

      assertWalletCanSignAndSendTransactions(activeWallet);

      const sendOptions: SendTransactionOptions | undefined =
        config?.minContextSlot === undefined
          ? undefined
          : { minContextSlot: config.minContextSlot };
      const wireTransactions = transactions.map((transaction) =>
        getTransactionEncoder().encode(transaction),
      );
      const signatures = await withTimeout(
        sendTransactions(activeWallet, wireTransactions, sendOptions),
        SEND_TIMEOUT_MS,
        {
          signal: config?.abortSignal,
          message: SEND_TIMEOUT_MESSAGE,
        },
      );

      if (signatures.length !== wireTransactions.length) {
        throw createSolanaError(
          "WALLET_FAILURE",
          `Wallet returned ${signatures.length} signature(s) for ${wireTransactions.length} transaction(s)`,
        );
      }

      return Object.freeze(signatures.map(toSignatureBytes));
    },
  };
}

/**
 * Prefers the singular request for one transaction when available, otherwise
 * uses the batch request, or falls back to one singular request per
 * transaction in sequence. The fallback is sequential on purpose: a parallel
 * batch would strand in-flight siblings on the first failure and lose the
 * signatures that already landed.
 */
async function sendTransactions(
  wallet: SolanaWallet,
  wireTransactions: readonly SolanaTransaction[],
  options: SendTransactionOptions | undefined,
): Promise<Signature[]> {
  const [transaction] = wireTransactions;

  if (transaction && wireTransactions.length === 1 && wallet.signAndSendTransaction) {
    const result = await wallet.signAndSendTransaction(transaction, options);

    return [result.signature as Signature];
  }

  if (wallet.signAndSendTransactions) {
    const batch = await wallet.signAndSendTransactions([...wireTransactions], options);

    return batch.map((signature) => signature as Signature);
  }

  const signatures: Signature[] = [];

  for (const nextTransaction of wireTransactions) {
    try {
      const result = await wallet.signAndSendTransaction!(nextTransaction, options);
      signatures.push(result.signature as Signature);
    } catch (cause) {
      throw new PartialSignAndSendError(normalizeSolanaError(cause, "RPC_FAILURE"), signatures);
    }
  }

  return signatures;
}
