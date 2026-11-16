import { createSolanaError } from "@vue-solana/core/errors";
import {
  assertIsTransactionWithinSizeLimit,
  bytesEqual,
  getCompiledTransactionMessageDecoder,
  getTransactionDecoder,
  getTransactionEncoder,
  getTransactionLifetimeConstraintFromCompiledTransactionMessage,
  type Transaction,
  type TransactionModifyingSigner,
  type TransactionWithinSizeLimit,
  type TransactionWithLifetime,
} from "@vue-solana/core/kit";
import { assertWalletCanSign } from "@vue-solana/core/wallet";
import { useWallet } from "./useWallet";
import {
  assertSolanaChain,
  getAccountSigningWallet,
  resolveWalletAccountAddress,
  type WalletAccountSource,
} from "./wallet-account-signer";

type SignedTransaction = Transaction & TransactionWithinSizeLimit & TransactionWithLifetime;
type SignedTransactions = readonly SignedTransaction[];

/**
 * A Kit {@link TransactionModifyingSigner} backed by a wallet account.
 *
 * Like `useWalletAccountMessageSigner()`, the conservative interface reflects
 * that the wallet may rewrite the transaction before signing (fee payer,
 * priority fee, or guard instructions), so it exposes
 * `modifyAndSignTransactions()` rather than a non-modifying signer.
 *
 * The account is resolved at call time, so a ref or getter lets one signer
 * follow the current selection. Signing fails with `WALLET_NOT_CONNECTED`
 * when no wallet is connected and `INVALID_INPUT` when the connected account
 * differs from the one the signer was created for. `chain` must be a Solana
 * chain identifier (`solana:mainnet`, `solana:devnet`, …); the adapter already
 * selected a chain when the wallet was adapted, so it is validated rather
 * than forwarded with the request.
 *
 * ```ts
 * import { useWalletAccountTransactionSigner } from "@vue-solana/vue/useWalletAccountTransactionSigner";
 *
 * const [selectedAccount] = useSelectedWalletAccount();
 * const signer = useWalletAccountTransactionSigner(selectedAccount, "solana:devnet");
 * const [signed] = await signer.modifyAndSignTransactions([transaction]);
 * ```
 */
export function useWalletAccountTransactionSigner(
  account: WalletAccountSource,
  chain: string,
): TransactionModifyingSigner {
  assertSolanaChain(chain);

  const { wallet } = useWallet();

  return {
    get address() {
      return resolveWalletAccountAddress(account);
    },
    async modifyAndSignTransactions(transactions, config) {
      config?.abortSignal?.throwIfAborted();

      const address = resolveWalletAccountAddress(account);

      if (transactions.length === 0) {
        return [] as SignedTransactions;
      }

      // One wallet request signs one transaction. A batch would be one prompt
      // per transaction, which is what `useSignTransactions()` is for; doing
      // it silently here would surprise the user with extra popups.
      if (transactions.length > 1) {
        throw createSolanaError(
          "WALLET_FEATURE_UNSUPPORTED",
          "Wallets sign one transaction per request in this signer. Call modifyAndSignTransactions() once per transaction, or use useSignTransactions() for a batch.",
          { feature: "signTransaction" },
        );
      }

      const activeWallet = getAccountSigningWallet(wallet.value, address);

      assertWalletCanSign(activeWallet);

      const transaction = transactions[0];

      if (!transaction) {
        return [] as SignedTransactions;
      }

      const wireBytes = getTransactionEncoder().encode(transaction);
      const signedBytes = await activeWallet.signTransaction(wireBytes);
      const decoded = getTransactionDecoder().decode(signedBytes);

      assertIsTransactionWithinSizeLimit(decoded);

      config?.abortSignal?.throwIfAborted();

      return Object.freeze([await attachLifetime(decoded, transaction)]) as SignedTransactions;
    },
  };
}

/**
 * The wallet may rewrite the message (and therefore its lifetime token). When
 * it did not touch the message bytes, the lifetime the caller attached is
 * still authoritative; when it did, derive a fresh one from the signed message
 * so the returned transaction stays usable.
 */
async function attachLifetime(
  decoded: Transaction & TransactionWithinSizeLimit,
  original: Transaction | (Transaction & TransactionWithLifetime),
): Promise<SignedTransaction> {
  if ("lifetimeConstraint" in original) {
    const { lifetimeConstraint } = original;

    if (bytesEqual(decoded.messageBytes, original.messageBytes)) {
      return Object.freeze({ ...decoded, lifetimeConstraint });
    }

    const compiled = getCompiledTransactionMessageDecoder().decode(decoded.messageBytes);
    const currentToken =
      "blockhash" in lifetimeConstraint ? lifetimeConstraint.blockhash : lifetimeConstraint.nonce;

    if (compiled.lifetimeToken === currentToken) {
      return Object.freeze({ ...decoded, lifetimeConstraint });
    }
  }

  const compiled = getCompiledTransactionMessageDecoder().decode(decoded.messageBytes);
  const lifetimeConstraint =
    await getTransactionLifetimeConstraintFromCompiledTransactionMessage(compiled);

  return Object.freeze({ ...decoded, lifetimeConstraint });
}
