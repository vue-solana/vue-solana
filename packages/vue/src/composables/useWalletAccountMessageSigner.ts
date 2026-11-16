import { createSolanaError } from "@vue-solana/core/errors";
import {
  bytesEqual,
  type MessageModifyingSigner,
  type SignatureBytes,
  type SignableMessage,
} from "@vue-solana/core/kit";
import { assertWalletCanSignMessage } from "@vue-solana/core/wallet";
import { useWallet } from "./useWallet";
import {
  getAccountSigningWallet,
  resolveWalletAccountAddress,
  type WalletAccountSource,
} from "./wallet-account-signer";

/**
 * A Kit {@link MessageModifyingSigner} backed by a wallet account.
 *
 * The conservative interface is deliberate: the app cannot know whether a
 * wallet rewrites the message before signing it (for example to prefix its own
 * authentication envelope), so the signer promises `modifyAndSignMessages()`
 * rather than plain `signMessages()`.
 *
 * Pass the account from `useWallets()`/`useSelectedWalletAccount()` (or its
 * address), optionally inside a ref or getter so the signer follows the
 * selected account. The signer signs through the connected wallet, so signing
 * fails with `WALLET_NOT_CONNECTED` when no wallet is connected and
 * `INVALID_INPUT` when the connected account is not the one the signer was
 * created for.
 *
 * ```ts
 * import { createSignableMessage } from "@vue-solana/vue/kit";
 * import { useWalletAccountMessageSigner } from "@vue-solana/vue/useWalletAccountMessageSigner";
 *
 * const [selectedAccount] = useSelectedWalletAccount();
 * const signer = useWalletAccountMessageSigner(selectedAccount);
 * const [signed] = await signer.modifyAndSignMessages([
 *   createSignableMessage("Sign in to My Vue Solana App"),
 * ]);
 * signed.signatures[signer.address]; // signature bytes
 * ```
 */
export function useWalletAccountMessageSigner(
  account: WalletAccountSource,
): MessageModifyingSigner {
  const { wallet } = useWallet();

  return {
    get address() {
      return resolveWalletAccountAddress(account);
    },
    async modifyAndSignMessages(messages, config) {
      config?.abortSignal?.throwIfAborted();

      const address = resolveWalletAccountAddress(account);

      if (messages.length === 0) {
        return messages;
      }

      // A Wallet Standard message request signs one message. Batch signing
      // would need one wallet prompt per message, which is the caller's call
      // to make (loop over the signer) rather than something to hide here.
      if (messages.length > 1) {
        throw createSolanaError(
          "WALLET_FEATURE_UNSUPPORTED",
          "Wallets sign one message per request. Call modifyAndSignMessages() once per message.",
          { feature: "signMessage" },
        );
      }

      const activeWallet = getAccountSigningWallet(wallet.value, address);

      assertWalletCanSignMessage(activeWallet);

      const message = messages[0];

      if (!message) {
        return messages;
      }

      const result = await activeWallet.signMessage(message.content);
      const content = Uint8Array.from(result.signedMessage);
      const signature = Uint8Array.from(result.signature) as SignatureBytes;
      const previousSignature = message.signatures[address];
      const messageUnchanged = bytesEqual(content, message.content);

      // Nothing changed: keep the caller's message object instead of handing
      // back an equal copy it would have to diff.
      if (messageUnchanged && previousSignature && bytesEqual(previousSignature, signature)) {
        return messages;
      }

      // A wallet that modified the message invalidates every signature that
      // covered the old bytes; a wallet that did not keeps them.
      const signatures = messageUnchanged
        ? { ...message.signatures, [address]: signature }
        : { [address as string]: signature };

      return Object.freeze([
        Object.freeze({ content, signatures: Object.freeze(signatures) }) as SignableMessage,
      ]);
    },
  };
}
