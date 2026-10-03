import type { SolanaSignInInput, SolanaSignInResult } from "@vue-solana/core/types";
import { assertWalletCanSignIn, createNoWalletSelectedError } from "@vue-solana/core/wallet";
import { shallowRef } from "vue";
import { useExecution } from "./use-execution";
import { useWallet } from "./useWallet";

export type SignInStatus = "idle" | "signing-in" | "signed-in" | "error";

/**
 * Trigger a wallet's Sign In With Solana (SIWS) feature.
 *
 * Resolves `{ account, signedMessage, signature }` for **server-side
 * verification** — the signature is over `signedMessage` and must be verified
 * against `account.publicKey` on your backend before trusting the identity
 * (see the message-signing guide). The wallet UI drives domain/nonce consent.
 */
export function useSignIn() {
  const { wallet } = useWallet();
  const signInResult = shallowRef<SolanaSignInResult | null>(null);
  const { status, loading, error, execute } = useExecution<SignInStatus>("signing-in");

  function signIn(input?: SolanaSignInInput): Promise<SolanaSignInResult> {
    signInResult.value = null;

    return execute(
      async () => {
        const activeWallet = wallet.value;

        if (!activeWallet) {
          throw createNoWalletSelectedError();
        }

        assertWalletCanSignIn(activeWallet);

        return activeWallet.signIn(input);
      },
      (result) => {
        signInResult.value = result;

        return "signed-in";
      },
    );
  }

  return {
    signInResult,
    status,
    loading,
    error,
    signIn,
  };
}
