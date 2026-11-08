import type { Wallet, WalletAccount } from "@wallet-standard/base";
import { StandardConnect, StandardDisconnect, StandardEvents } from "@wallet-standard/features";
import {
  SolanaSignAndSendTransaction,
  SolanaSignIn,
  SolanaSignMessage,
  SolanaSignTransaction,
} from "@solana/wallet-standard-features";
import type { SolanaSignInInput, SolanaSignInOutput } from "@solana/wallet-standard-features";
import { getBase58Decoder } from "@solana/kit";
import type { Address, Signature } from "../kit";
import { createSolanaError, normalizeSolanaError, PartialSignAndSendError } from "../errors";
import {
  getSolanaMobileWalletAuthorizationStore,
  type SolanaMobileWalletAuthorizationStore,
} from "../mobile-wallet-authorization";
import { assertWalletSignature } from "./verify-wallet-signature";
import type {
  SendTransactionOptions,
  SolanaChain,
  SolanaSignInResult,
  SolanaTransaction,
  SolanaWallet,
  SolanaWalletConnectOptions,
  SolanaWalletInfo,
} from "../types";
import { SOLANA_CHAINS } from "./chains";
import {
  hasSignAndSendTransaction,
  hasSignIn,
  hasSignMessage,
  hasSignTransaction,
  type SolanaSignInFeature,
  type SolanaSignTransactionFeature,
  type StandardConnectFeature,
  type StandardDisconnectFeature,
  type StandardEventsFeature,
} from "./features";

export interface AdaptSolanaWalletOptions {
  chain?: SolanaChain;
  account?: WalletAccount;
  onChange?: () => void;
  /**
   * Submits a signed transaction (typically through the app's RPC). Lets a
   * Mobile Wallet Adapter batch be signed in one wallet session and sent here,
   * instead of MWA's own `signAndSendTransaction`, which opens the wallet app
   * once per transaction.
   */
  sendTransaction?: (
    signedTransaction: SolanaTransaction,
    options?: SendTransactionOptions,
  ) => Promise<string>;
}

/**
 * A Wallet Standard wallet adapted to {@link SolanaWallet}. `dispose` is
 * always present here (optional on the base interface, where plain
 * caller-supplied wallets typically omit it).
 */
export interface AdaptedSolanaWallet extends SolanaWallet {
  dispose(): void;
}

const SIGNATURE_LENGTH = 64;

export function adaptSolanaStandardWallet(
  walletInfo: SolanaWalletInfo,
  options: AdaptSolanaWalletOptions = {},
): AdaptedSolanaWallet {
  const wallet = walletInfo.wallet as Wallet;
  let accounts = wallet.accounts;
  let account = options.account;
  let allowAccountUpdates = Boolean(options.account);
  let connecting = false;
  let disconnecting = false;
  let manuallyDisconnected = false;
  // While an MWA sign-in swaps the wallet's authorization, `change` events
  // report that swap, not a user choice: `account` is settled by the sign-in.
  let signingIn = false;
  const isMobileWalletAdapter = walletInfo.source === "mobile-wallet-adapter";
  // Rejecters of the MWA requests in flight; see `whileMobileWalletAuthorized`.
  const pendingMobileWalletRequests = new Set<(error: Error) => void>();

  const eventsFeature = wallet.features[StandardEvents] as
    | StandardEventsFeature[typeof StandardEvents]
    | undefined;
  const unsubscribeChange = eventsFeature?.on("change", (properties) => {
    if (properties.accounts) {
      accounts = properties.accounts;

      if (accounts.length === 0) {
        rejectPendingMobileWalletRequests();
      }

      if (!signingIn) {
        account =
          allowAccountUpdates && !manuallyDisconnected
            ? getSolanaAccount(accounts, options.chain)
            : undefined;
      }

      options.onChange?.();
    }
  });

  function dispose() {
    unsubscribeChange?.();
  }

  /**
   * MWA re-authorizes with the cached auth token before every signing request.
   * When the wallet rejects that token (revoked, or issued under another app
   * identity) MWA drops its authorization — emitting `change` with no accounts —
   * and then deliberately never settles the request, because its connection
   * generation moved on. Phantom shows no prompt in that case, so without this
   * the request would hang forever. It is rejected instead, and the next
   * `connect()` authorizes afresh because MWA also cleared its cache.
   */
  function whileMobileWalletAuthorized<T>(request: () => Promise<T>): Promise<T> {
    if (!isMobileWalletAdapter) {
      return request();
    }

    let reject!: (error: Error) => void;
    const deauthorized = new Promise<never>((_, rejectRequest) => {
      reject = rejectRequest;
    });

    pendingMobileWalletRequests.add(reject);

    return Promise.race([request(), deauthorized]).finally(() => {
      pendingMobileWalletRequests.delete(reject);
    });
  }

  /**
   * MWA's own `signMessage` cannot recover when the wallet rejects the cached
   * auth token (Phantom rejects even a fresh one), so a message is signed in a
   * session `registerSolanaMobileWallet()` runs instead. `undefined` when MWA
   * was registered by the app itself and no such session exists.
   */
  function signMessageThroughMobileWalletSession(
    activeAccount: WalletAccount,
    message: Uint8Array,
  ): Promise<{ signedMessage: Uint8Array; signature: Uint8Array }[]> | undefined {
    const signMessages = isMobileWalletAdapter
      ? getSolanaMobileWalletAuthorizationStore()?.signMessages
      : undefined;

    return signMessages?.(Uint8Array.from(activeAccount.publicKey), [message]).then(
      (signedPayloads) =>
        signedPayloads.map((signedMessage) => ({
          signedMessage,
          signature: signedMessage.slice(-SIGNATURE_LENGTH),
        })),
    );
  }

  function rejectPendingMobileWalletRequests() {
    for (const reject of pendingMobileWalletRequests) {
      reject(
        createSolanaError(
          "WALLET_NOT_CONNECTED",
          "The wallet ended this app's session instead of signing, usually because it no longer accepts the saved authorization. Connect the wallet again and retry.",
        ),
      );
    }

    pendingMobileWalletRequests.clear();
  }

  async function verifySignInResult(
    result: SolanaSignInOutput | undefined,
    requestedAddress: string | undefined,
  ): Promise<{ signInResult: SolanaSignInResult; signInAccount: WalletAccount }> {
    if (!result) {
      throw new Error("Solana wallet did not return a sign-in result");
    }

    const signInResult = toSolanaSignInResult(result);
    const isSignInAccount = (candidate: WalletAccount) =>
      candidate.address === signInResult.account.address;
    // `accounts` follows the wallet's `change` events; the live list is the
    // fallback for a wallet that authorized without emitting one first.
    const signInAccount = accounts.find(isSignInAccount) ?? wallet.accounts.find(isSignInAccount);

    if (!signInAccount) {
      throw createSolanaError(
        "INVALID_SIGNATURE",
        "The wallet returned a sign-in account it does not expose.",
      );
    }

    if (requestedAddress !== undefined && requestedAddress !== signInAccount.address) {
      throw createSolanaError(
        "INVALID_SIGNATURE",
        `The wallet signed in as ${signInResult.account.address} instead of the requested ${requestedAddress}.`,
      );
    }

    await assertWalletSignature(
      signInAccount.publicKey,
      signInResult.signedMessage,
      signInResult.signature,
      "sign-in",
    );

    return { signInResult, signInAccount };
  }

  /**
   * MWA's `signIn` answers from its cached authorization whenever one exists —
   * and every connect writes one — without opening the wallet, then throws "no
   * sign in result returned by wallet". The authorization is cleared first (no
   * wallet round trip) so the sign-in authorizes afresh.
   *
   * A sign-in that fails — cancelled, or rejected because the wallet answered
   * with another account — puts the previous authorization back, so it neither
   * logs the user out nor leaves the wallet authorized for an account the app
   * refused.
   */
  async function signInThroughMobileWalletAdapter(
    signInWallet: Wallet & { features: SolanaSignInFeature },
    signInInput: SolanaSignInInput,
    requestedAddress: string | undefined,
  ): Promise<SolanaSignInResult> {
    const disconnectFeature = wallet.features[
      StandardDisconnect
    ] as StandardDisconnectFeature[typeof StandardDisconnect];
    const authorizationStore = getSolanaMobileWalletAuthorizationStore();
    const previous = { accounts, account, allowAccountUpdates, manuallyDisconnected };
    const wasAuthorized = wallet.accounts.length > 0;
    const previousAuthorization = await authorizationStore?.get().catch(() => undefined);

    signingIn = true;

    try {
      await disconnectFeature.disconnect();

      const [result] = await signInWallet.features[SolanaSignIn].signIn(signInInput);
      const { signInResult, signInAccount } = await verifySignInResult(result, requestedAddress);

      // The sign-in replaced the cleared authorization, so the signed-in
      // account is now the connected one.
      accounts = wallet.accounts;
      allowAccountUpdates = true;
      manuallyDisconnected = false;
      account = signInAccount;

      return signInResult;
    } catch (error) {
      await restoreMobileWalletAuthorization(
        disconnectFeature,
        authorizationStore,
        previousAuthorization,
        wasAuthorized,
      );

      accounts = wallet.accounts;
      allowAccountUpdates = previous.allowAccountUpdates;
      manuallyDisconnected = previous.manuallyDisconnected;
      // Only claim the previous account when the wallet really holds it again.
      account =
        previous.account &&
        accounts.some((candidate) => candidate.address === previous.account?.address)
          ? previous.account
          : undefined;

      throw error;
    } finally {
      signingIn = false;
      options.onChange?.();
    }
  }

  /**
   * Best effort: drops whatever the failed sign-in authorized, writes the
   * previous cache entry back, and — when the wallet was authorized before —
   * reloads it with a silent connect, which reads the cache and never launches
   * the wallet. Without a store (MWA registered by the app itself) the wallet
   * just ends up unauthorized, and the adapter reports it disconnected.
   */
  async function restoreMobileWalletAuthorization(
    disconnectFeature: StandardDisconnectFeature[typeof StandardDisconnect],
    authorizationStore: SolanaMobileWalletAuthorizationStore | undefined,
    previousAuthorization: unknown,
    wasAuthorized: boolean,
  ) {
    try {
      if (wallet.accounts.length > 0) {
        await disconnectFeature.disconnect();
      }

      if (!authorizationStore || previousAuthorization === undefined) {
        return;
      }

      await authorizationStore.set(previousAuthorization);

      if (wasAuthorized) {
        const connectFeature = wallet.features[
          StandardConnect
        ] as StandardConnectFeature[typeof StandardConnect];
        await connectFeature.connect({ silent: true });
      }
    } catch {
      // The sign-in error is what the caller needs; a failed restore leaves
      // the wallet unauthorized, which the adapter state then reflects.
    }
  }

  return {
    platform: walletInfo.platform,
    source: walletInfo.source,
    dispose,
    get publicKey() {
      return account ? (account.address as Address) : null;
    },
    get connected() {
      return Boolean(account);
    },
    get connecting() {
      return connecting;
    },
    get disconnecting() {
      return disconnecting;
    },
    async connect(connectOptions?: SolanaWalletConnectOptions) {
      connecting = true;
      manuallyDisconnected = false;
      options.onChange?.();

      try {
        const feature = wallet.features[
          StandardConnect
        ] as StandardConnectFeature[typeof StandardConnect];
        const result = await (connectOptions?.silent
          ? feature.connect({ silent: true })
          : feature.connect());
        const nextAccount = getSolanaAccount(result.accounts, options.chain);

        // A silent connect with no prior authorization is not a failure: the
        // wallet just has nothing to restore, so stay disconnected.
        if (!nextAccount && connectOptions?.silent) {
          return;
        }

        accounts = result.accounts;
        allowAccountUpdates = true;
        account = nextAccount;

        if (!account) {
          throw new Error("Solana wallet did not authorize a Solana account");
        }
      } finally {
        connecting = false;
        options.onChange?.();
      }
    },
    async disconnect() {
      const feature = wallet.features[
        StandardDisconnect
      ] as StandardDisconnectFeature[typeof StandardDisconnect];

      disconnecting = true;
      manuallyDisconnected = true;
      allowAccountUpdates = false;
      account = undefined;
      options.onChange?.();

      try {
        await feature.disconnect();
        accounts = [];
        account = undefined;
      } catch (error) {
        manuallyDisconnected = false;
        allowAccountUpdates = true;
        account = getSolanaAccount(accounts, options.chain);
        throw error;
      } finally {
        disconnecting = false;
        options.onChange?.();
      }
    },
    signIn: hasSignIn(wallet)
      ? async (input?: SolanaSignInInput): Promise<SolanaSignInResult> => {
          // An omitted input is built from the active account, so the account
          // the caller is asking about is either `input.address` or the active
          // one. Verifying only the returned account let a wallet answer with a
          // *different* account it controls, sign for itself, and pass.
          const requestedAddress = input?.address ?? account?.address;

          if (isMobileWalletAdapter) {
            // MWA has no active session to require: its sign-in *is* the
            // authorization, so a disconnected app can sign in with the domain alone.
            return signInThroughMobileWalletAdapter(
              wallet,
              input ?? getDefaultSignInInput(account),
              requestedAddress,
            );
          }

          const [result] = await wallet.features[SolanaSignIn].signIn(
            input ?? getDefaultSignInInput(getActiveAccount(account)),
          );

          return (await verifySignInResult(result, requestedAddress)).signInResult;
        }
      : undefined,
    signMessage: hasSignMessage(wallet)
      ? async (message) => {
          const activeAccount = getActiveAccount(account);
          const [result] = await whileMobileWalletAuthorized(
            () =>
              signMessageThroughMobileWalletSession(activeAccount, message) ??
              wallet.features[SolanaSignMessage].signMessage({
                account: activeAccount,
                message,
              }),
          );

          if (!result) {
            throw new Error("Solana wallet did not return a message signature");
          }

          const signedMessage = getSignedMessageBytes(
            message,
            result.signedMessage,
            result.signature,
          );

          await assertWalletSignature(
            activeAccount.publicKey,
            signedMessage,
            result.signature,
            "message",
          );

          return { ...result, signedMessage };
        }
      : undefined,
    signTransaction: hasSignTransaction(wallet)
      ? async (transaction) => {
          const activeAccount = getActiveAccount(account);
          const [result] = await whileMobileWalletAuthorized(() =>
            wallet.features[SolanaSignTransaction].signTransaction({
              account: activeAccount,
              transaction: new Uint8Array(transaction),
              chain: options.chain,
            }),
          );

          if (!result) {
            throw new Error("Solana wallet did not return a signed transaction");
          }

          return result.signedTransaction;
        }
      : undefined,
    signAllTransactions: hasSignTransaction(wallet)
      ? async (transactions) =>
          whileMobileWalletAuthorized(() =>
            signAllThroughFeature(
              wallet as Wallet & { features: SolanaSignTransactionFeature },
              () => getActiveAccount(account),
              transactions,
              options.chain,
            ),
          )
      : undefined,
    signTransactions: hasSignTransaction(wallet)
      ? async (transactions) =>
          whileMobileWalletAuthorized(() =>
            signAllThroughFeature(
              wallet as Wallet & { features: SolanaSignTransactionFeature },
              () => getActiveAccount(account),
              transactions,
              options.chain,
            ),
          )
      : undefined,
    signAndSendTransaction: hasSignAndSendTransaction(wallet)
      ? async (transaction, sendOptions) => {
          const activeAccount = getActiveAccount(account);
          const [result] = await whileMobileWalletAuthorized(() =>
            wallet.features[SolanaSignAndSendTransaction].signAndSendTransaction({
              account: activeAccount,
              transaction: new Uint8Array(transaction),
              chain: options.chain ?? getSolanaAccountChain(activeAccount),
              options: sendOptions,
            }),
          );

          if (!result) {
            throw new Error("Solana wallet did not return a transaction signature");
          }

          return { signature: getBase58Decoder().decode(result.signature) };
        }
      : undefined,
    signAndSendTransactions: hasSignAndSendTransaction(wallet)
      ? async (transactions, sendOptions) => {
          const activeAccount = getActiveAccount(account);

          // MWA runs every `signAndSendTransaction` input as its own wallet
          // session, so a batch launches the wallet app once per transaction —
          // and from the second launch on there is no user gesture left, so
          // Chrome blocks the intent and MWA reports "wallet not found". One
          // `signTransaction` call signs the whole batch in a single session.
          if (
            isMobileWalletAdapter &&
            options.sendTransaction &&
            transactions.length > 1 &&
            hasSignTransaction(wallet)
          ) {
            const signedTransactions = await whileMobileWalletAuthorized(() =>
              signAllThroughFeature(wallet, () => activeAccount, transactions, options.chain),
            );

            return sendSequentially(signedTransactions, options.sendTransaction, sendOptions);
          }

          const results = await whileMobileWalletAuthorized(() =>
            wallet.features[SolanaSignAndSendTransaction].signAndSendTransaction(
              ...transactions.map((transaction) => ({
                account: activeAccount,
                transaction: new Uint8Array(transaction),
                chain: options.chain ?? getSolanaAccountChain(activeAccount),
                options: sendOptions,
              })),
            ),
          );

          if (results.length !== transactions.length) {
            throw new Error(
              `Solana wallet returned ${results.length} signatures for ${transactions.length} requested transactions`,
            );
          }

          return results.map((result) => {
            if (!result) {
              throw new Error("Solana wallet did not return a transaction signature");
            }

            return getBase58Decoder().decode(result.signature);
          });
        }
      : undefined,
  };
}

/**
 * Disconnects a discovered Wallet Standard wallet without adapting it.
 *
 * Reads `standard:disconnect` straight off the wallet instead of going through
 * an adapter on purpose: a wallet the app authorized in an earlier page session
 * has no adapter yet, so an adapter-only sweep misses it, and adapting it just
 * to disconnect would register a `change` subscription for a wallet the user
 * never selects. Resolves `false` when the wallet exposes no disconnect feature
 * (for example an iOS deep-link definition); rejects with the wallet's own
 * error, so a caller sweeping a list should catch per wallet.
 */
export async function disconnectSolanaStandardWallet(
  walletInfo: SolanaWalletInfo,
): Promise<boolean> {
  const wallet = walletInfo.wallet as Partial<Wallet> | null | undefined;

  if (typeof wallet !== "object" && typeof wallet !== "function") {
    return false;
  }

  const features = wallet?.features as Record<string, unknown> | undefined;
  const feature = features?.[StandardDisconnect] as
    | StandardDisconnectFeature[typeof StandardDisconnect]
    | undefined;

  if (typeof feature?.disconnect !== "function") {
    return false;
  }

  await feature.disconnect();
  return true;
}

/**
 * Sequential on purpose, like the composable's singular fallback: a failure
 * reports the signatures that already landed so a retry can skip them.
 */
async function sendSequentially(
  signedTransactions: readonly SolanaTransaction[],
  sendTransaction: NonNullable<AdaptSolanaWalletOptions["sendTransaction"]>,
  sendOptions: SendTransactionOptions | undefined,
): Promise<string[]> {
  const signatures: Signature[] = [];

  for (const signedTransaction of signedTransactions) {
    try {
      signatures.push((await sendTransaction(signedTransaction, sendOptions)) as Signature);
    } catch (cause) {
      throw new PartialSignAndSendError(normalizeSolanaError(cause, "RPC_FAILURE"), signatures);
    }
  }

  return signatures;
}

async function signAllThroughFeature(
  wallet: Wallet & { features: SolanaSignTransactionFeature },
  getAccount: () => WalletAccount,
  transactions: readonly SolanaTransaction[],
  chain: SolanaChain | undefined,
): Promise<SolanaTransaction[]> {
  const activeAccount = getAccount();
  const results = await wallet.features[SolanaSignTransaction].signTransaction(
    ...transactions.map((transaction) => ({
      account: activeAccount,
      transaction: new Uint8Array(transaction),
      chain,
    })),
  );

  if (results.length !== transactions.length) {
    throw new Error(
      `Solana wallet returned ${results.length} signed transactions for ${transactions.length} requested transactions`,
    );
  }

  return results.map((result) => {
    if (!result) {
      throw new Error("Solana wallet did not return a signed transaction");
    }

    return result.signedTransaction;
  });
}

/**
 * Always send a complete sign-in request: Phantom resolves an empty result
 * without opening any popup when `solana:signIn` gets no input. `host` (not
 * `origin`) is what the request domain has to be for Backpack not to warn that
 * the domain does not match the requesting one.
 */
function getDefaultSignInInput(account: WalletAccount | undefined): SolanaSignInInput {
  const domain = typeof location === "undefined" ? "" : location.host;

  return account ? { domain, address: account.address } : { domain };
}

/**
 * The bytes the wallet actually signed. The Mobile Wallet Adapter returns its
 * MWA `signed_payloads` entry — the message with the signature appended — as
 * `signedMessage`, and its trailing 64 bytes as `signature`. Wallet Standard
 * defines `signedMessage` as the signed bytes, so verifying against MWA's value
 * could never pass, and a server verifying it would fail the same way. When the
 * result is exactly that shape (or the bare signature), the signed bytes are
 * the request's message. Any other shape — a wallet that prefixes the message,
 * say — is left for signature verification to judge.
 */
function getSignedMessageBytes(
  message: Uint8Array,
  signedMessage: Uint8Array,
  signature: Uint8Array,
): Uint8Array {
  if (
    signedMessage.length === message.length + signature.length &&
    bytesEqual(signedMessage.subarray(0, message.length), message) &&
    bytesEqual(signedMessage.subarray(message.length), signature)
  ) {
    return message;
  }

  if (bytesEqual(signedMessage, signature) && !bytesEqual(message, signature)) {
    return message;
  }

  return signedMessage;
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((byte, index) => byte === b[index]);
}

function toSolanaSignInResult(result: SolanaSignInOutput): SolanaSignInResult {
  return {
    account: {
      address: result.account.address as Address,
      publicKey: Uint8Array.from(result.account.publicKey),
      chains: [...result.account.chains],
      label: result.account.label,
      icon: result.account.icon,
    },
    signedMessage: result.signedMessage,
    signature: result.signature,
    signatureType: result.signatureType,
  };
}

function getSolanaAccount(
  accounts: readonly WalletAccount[],
  chain?: SolanaChain,
): WalletAccount | undefined {
  return (
    accounts.find((account) => account.chains.some((accountChain) => accountChain === chain)) ??
    accounts.find((account) =>
      account.chains.some((accountChain) => SOLANA_CHAINS.includes(accountChain as SolanaChain)),
    )
  );
}

function getActiveAccount(account: WalletAccount | undefined): WalletAccount {
  if (!account) {
    throw new Error("Solana wallet is not connected");
  }

  return account;
}

function getSolanaAccountChain(account: WalletAccount): SolanaChain {
  const chain = account.chains.find((accountChain) =>
    SOLANA_CHAINS.includes(accountChain as SolanaChain),
  );

  if (!chain) {
    throw new Error("Solana wallet account does not support a Solana chain");
  }

  return chain as SolanaChain;
}
