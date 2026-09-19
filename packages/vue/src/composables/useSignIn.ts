import type { SolanaSignInInput, SolanaSignInResult } from "@vue-solana/core/types";
import { normalizeSolanaError, type SolanaError } from "@vue-solana/core/errors";
import { assertWalletCanSignIn, createNoWalletSelectedError } from "@vue-solana/core/wallet";
import { ref, shallowRef } from "vue";
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
  const status = ref<SignInStatus>("idle");
  const loading = ref(false);
  const error = ref<SolanaError | null>(null);
  let executionId = 0;

  async function signIn(input?: SolanaSignInInput): Promise<SolanaSignInResult> {
    const currentExecutionId = ++executionId;

    status.value = "signing-in";
    loading.value = true;
    error.value = null;
    signInResult.value = null;

    const activeWallet = wallet.value;

    if (!activeWallet) {
      const normalizedError = createNoWalletSelectedError();
      error.value = normalizedError;
      status.value = "error";
      loading.value = false;

      throw normalizedError;
    }

    try {
      assertWalletCanSignIn(activeWallet);

      const result = await activeWallet.signIn(input);

      if (currentExecutionId === executionId) {
        signInResult.value = result;
        status.value = "signed-in";
      }

      return result;
    } catch (cause) {
      const normalizedError = normalizeSolanaError(cause, "RPC_FAILURE");

      if (currentExecutionId === executionId) {
        error.value = normalizedError;
        status.value = "error";
      }

      throw normalizedError;
    } finally {
      if (currentExecutionId === executionId) {
        loading.value = false;
      }
    }
  }

  return {
    signInResult,
    status,
    loading,
    error,
    signIn,
  };
}
