import {
  transact,
  type AppIdentity,
  type AuthorizationResult,
  type Chain,
  type MobileWallet,
} from "@solana-mobile/mobile-wallet-adapter-protocol";
import type { AuthorizationCache } from "@solana-mobile/wallet-standard-mobile";
import { getBase64Decoder, getBase64Encoder } from "@solana/kit";
import { createSolanaError } from "../errors";

export interface SignMobileWalletMessagesOptions {
  appIdentity: AppIdentity;
  authorizationCache: AuthorizationCache;
  publicKey: Uint8Array;
  messages: readonly Uint8Array[];
}

/**
 * Signs messages in a Mobile Wallet Adapter session this package runs itself,
 * instead of through MWA's `solana:signMessage`.
 *
 * MWA re-authorizes with the cached auth token before signing and, when the
 * wallet rejects it, clears the session and never settles the request. Phantom
 * on Android Chrome rejects even a token it issued seconds earlier, so signing
 * never reached its prompt. Here a rejected token falls back to a fresh
 * `authorize` in the same session — the request `connect()` makes, which
 * Phantom accepts — and the fresh token replaces the cached one. Both wallet
 * errors are kept in the thrown error, since MWA's own path discards them.
 *
 * Returns MWA's signed payloads: each message with its signature appended.
 */
export async function signMobileWalletMessages({
  appIdentity,
  authorizationCache,
  publicKey,
  messages,
}: SignMobileWalletMessagesOptions): Promise<Uint8Array[]> {
  const cachedAuthorization = await authorizationCache.get();

  if (!cachedAuthorization) {
    throw createSolanaError("WALLET_NOT_CONNECTED", "Solana wallet is not connected");
  }

  const base64Decoder = getBase64Decoder();
  const base64Encoder = getBase64Encoder();
  const address = base64Decoder.decode(publicKey);
  const chain = cachedAuthorization.chain as Chain;

  return transact(async (wallet) => {
    const authorization = await authorizeSession(
      wallet,
      appIdentity,
      chain,
      cachedAuthorization.auth_token,
    );

    if (!authorization.accounts.some((account) => account.address === address)) {
      throw createSolanaError(
        "WALLET_NOT_CONNECTED",
        "The wallet authorized a different account than the connected one. Connect the wallet again and retry.",
      );
    }

    if (authorization.auth_token !== cachedAuthorization.auth_token) {
      await authorizationCache.set({
        ...cachedAuthorization,
        auth_token: authorization.auth_token,
        wallet_uri_base: authorization.wallet_uri_base,
      });
    }

    const { signed_payloads } = await wallet.signMessages({
      addresses: messages.map(() => address),
      payloads: messages.map((message) => base64Decoder.decode(message)),
    });

    return signed_payloads.map((payload) => Uint8Array.from(base64Encoder.encode(payload)));
  });
}

async function authorizeSession(
  wallet: MobileWallet,
  identity: AppIdentity,
  chain: Chain,
  authToken: string,
): Promise<AuthorizationResult> {
  let reauthorizationError: unknown;

  try {
    return await wallet.authorize({ auth_token: authToken, identity, chain });
  } catch (error) {
    reauthorizationError = error;
  }

  try {
    return await wallet.authorize({ identity, chain });
  } catch (authorizationError) {
    throw createSolanaError(
      "WALLET_FAILURE",
      `The wallet rejected the saved authorization (${getErrorMessage(reauthorizationError)}) and a fresh one (${getErrorMessage(authorizationError)}).`,
      { cause: authorizationError },
    );
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
