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
import type { SendTransactionOptions } from "../types";

export interface MobileWalletSessionOptions {
  appIdentity: AppIdentity;
  authorizationCache: AuthorizationCache;
  /** Public key of the connected account the request is made for. */
  publicKey: Uint8Array;
}

/**
 * Runs a Mobile Wallet Adapter session this package drives itself, instead of
 * going through MWA's Wallet Standard features.
 *
 * MWA re-authorizes with the cached auth token before every request and, when
 * the wallet rejects it, clears the session and never settles the request.
 * Phantom on Android Chrome rejects even a token it issued seconds earlier, so
 * signing never reached its prompt. Here a rejected token falls back to a fresh
 * `authorize` in the same session — the request `connect()` makes, which
 * Phantom accepts — and the fresh token replaces the cached one. Both wallet
 * errors are kept in the thrown error, since MWA's own path discards them.
 */
async function runMobileWalletSession<T>(
  { appIdentity, authorizationCache, publicKey }: MobileWalletSessionOptions,
  request: (wallet: MobileWallet, address: string) => Promise<T>,
): Promise<T> {
  const cachedAuthorization = await authorizationCache.get();

  if (!cachedAuthorization) {
    throw createSolanaError("WALLET_NOT_CONNECTED", "Solana wallet is not connected");
  }

  const address = getBase64Decoder().decode(publicKey);
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

    return request(wallet, address);
  });
}

/** Returns MWA's signed payloads: each message with its signature appended. */
export function signMobileWalletMessages(
  options: MobileWalletSessionOptions,
  messages: readonly Uint8Array[],
): Promise<Uint8Array[]> {
  return runMobileWalletSession(options, async (wallet, address) => {
    const { signed_payloads } = await wallet.signMessages({
      addresses: messages.map(() => address),
      payloads: messages.map(toBase64),
    });

    return signed_payloads.map(fromBase64);
  });
}

/** Signs every transaction in one wallet visit and returns the signed bytes. */
export function signMobileWalletTransactions(
  options: MobileWalletSessionOptions,
  transactions: readonly Uint8Array[],
): Promise<Uint8Array[]> {
  return runMobileWalletSession(options, async (wallet) => {
    const { signed_payloads } = await wallet.signTransactions({
      payloads: transactions.map(toBase64),
    });

    return signed_payloads.map(fromBase64);
  });
}

/**
 * Signs and submits every transaction in one wallet visit (MWA's own feature
 * opens the wallet once per transaction) and returns the signature bytes.
 */
export function signAndSendMobileWalletTransactions(
  options: MobileWalletSessionOptions,
  transactions: readonly Uint8Array[],
  sendOptions?: SendTransactionOptions,
): Promise<Uint8Array[]> {
  return runMobileWalletSession(options, async (wallet) => {
    const capabilities = await wallet.getCapabilities();

    if (!capabilities.supports_sign_and_send_transactions) {
      throw createSolanaError(
        "WALLET_FEATURE_UNSUPPORTED",
        "The connected wallet does not support signAndSendTransaction",
      );
    }

    const { signatures } = await wallet.signAndSendTransactions({
      payloads: transactions.map(toBase64),
      options: toMobileWalletSendOptions(sendOptions),
    });

    return signatures.map(fromBase64);
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

/**
 * MWA's options are the wire names, and the request is JSON: a `bigint`
 * `maxRetries` would make the encoding throw.
 */
function toMobileWalletSendOptions(sendOptions: SendTransactionOptions | undefined) {
  if (!sendOptions) {
    return undefined;
  }

  return {
    commitment: sendOptions.preflightCommitment,
    skip_preflight: sendOptions.skipPreflight,
    max_retries: sendOptions.maxRetries === undefined ? undefined : Number(sendOptions.maxRetries),
    min_context_slot:
      sendOptions.minContextSlot === undefined ? undefined : Number(sendOptions.minContextSlot),
  };
}

function toBase64(bytes: Uint8Array): string {
  return getBase64Decoder().decode(bytes);
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(getBase64Encoder().encode(value));
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
