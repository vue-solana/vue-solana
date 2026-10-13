import type {
  Address,
  Commitment,
  ReadonlyUint8Array,
  Signature,
  Slot,
  TransactionSigner,
} from "@solana/kit";
import type { SolanaClient } from "./kit";

/**
 * Solana cluster names. `mainnet` is Solana's official mainnet cluster name.
 * The legacy `mainnet-beta` spelling is still accepted and redirects to the
 * same mainnet endpoint.
 */
export type SolanaCluster = "mainnet" | "mainnet-beta" | "testnet" | "devnet" | "localnet";

export type SolanaChain = "solana:mainnet" | "solana:testnet" | "solana:devnet" | "solana:localnet";

export interface SolanaConfig {
  cluster?: SolanaCluster;
  endpoint?: string;
  wsEndpoint?: string;
  commitment?: Commitment;
  autoConnect?: boolean;
  /**
   * Kit client signer used to pay fees and sign client-sent transactions
   * (e.g. `useSendTransaction()`). Install one for demo/relayer flows; never
   * ship a funded keypair to end-user browsers.
   */
  payer?: TransactionSigner;
  /**
   * Serializable variant of `payer`: a 64-byte Ed25519 keypair encoded as
   * base64 (secret key first). Resolved to a Kit `TransactionSigner` when the
   * client is created. Direct Vue/core demos only; Nuxt does not forward this
   * value through public runtime config. Dev/demos only; never ship a funded
   * secret to production browsers.
   */
  payerSecretKey?: string;
}

export interface SolanaContext {
  cluster: SolanaCluster;
  endpoint: string;
  wsEndpoint: string;
  client: SolanaClient;
}

/**
 * Raw serialized wire bytes. Widened to Kit's `ReadonlyUint8Array` because
 * that is what `getTransactionEncoder().encode()` returns — typing it as
 * `Uint8Array` rejected the output of the encoder the docs tell you to use.
 */
export type SolanaTransaction = ReadonlyUint8Array;

export interface SolanaSignMessageResult {
  signedMessage: Uint8Array;
  signature: Uint8Array;
}

export interface SolanaSignInAccount {
  address: Address;
  publicKey: Uint8Array;
  chains: string[];
  label?: string;
  icon?: string;
}

export interface SolanaSignInResult {
  account: SolanaSignInAccount;
  signedMessage: Uint8Array;
  signature: Uint8Array;
  signatureType?: "ed25519";
}

export interface SolanaSignInInput {
  domain?: string;
  address?: string;
  statement?: string;
  uri?: string;
  version?: string;
  chainId?: string;
  nonce?: string;
  issuedAt?: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: readonly string[];
}

export interface SolanaWallet {
  publicKey: Address | null;
  connected: boolean;
  connecting?: boolean;
  disconnecting?: boolean;
  platform?: SolanaWalletInfo["platform"];
  source?: SolanaWalletInfo["source"];
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  /**
   * Releases wallet-event subscriptions captured at adapt time (e.g. the
   * Wallet Standard `change` listener). The wallet stays connected; only
   * event delivery stops. Idempotent. Present on adapted wallets; plain
   * caller-supplied wallets typically omit it.
   */
  dispose?: () => void;
  signMessage?: (message: Uint8Array) => Promise<SolanaSignMessageResult>;
  signIn?: (input?: SolanaSignInInput) => Promise<SolanaSignInResult>;
  signTransaction?: (transaction: SolanaTransaction) => Promise<SolanaTransaction>;
  signAllTransactions?: (transactions: SolanaTransaction[]) => Promise<SolanaTransaction[]>;
  signTransactions?: (transactions: SolanaTransaction[]) => Promise<SolanaTransaction[]>;
  signAndSendTransaction?: (
    transaction: SolanaTransaction,
    options?: SendTransactionOptions,
  ) => Promise<{ signature: string }>;
  signAndSendTransactions?: (
    transactions: SolanaTransaction[],
    options?: SendTransactionOptions,
  ) => Promise<string[]>;
}

export interface SolanaWalletInfo {
  name: string;
  icon: string;
  chains: readonly string[];
  platform?: "browser" | "mobile" | "desktop";
  source?: "wallet-standard" | "mobile-wallet-adapter" | "deep-link" | "protocol-link";
  appUrl?: string;
  installUrl?: string;
  callbackUrl?: string;
  capabilities?: {
    connect?: boolean;
    disconnect?: boolean;
    signIn?: boolean;
    signMessage?: boolean;
    signTransaction?: boolean;
    signAllTransactions?: boolean;
    signAndSendTransaction?: boolean;
  };
  accounts: readonly {
    address: string;
    publicKey: Uint8Array;
    chains: readonly string[];
    label?: string;
    icon?: string;
  }[];
  wallet: unknown;
}

export interface SendTransactionOptions {
  skipPreflight?: boolean;
  maxRetries?: bigint;
  minContextSlot?: Slot;
  preflightCommitment?: Commitment;
}

export interface ConfirmTransactionOptions {
  commitment?: Commitment;
  timeoutMs?: number;
  /**
   * Milliseconds between `getSignatureStatuses` polls. Defaults to 1500.
   * Must be greater than 0: with no delay between polls an absent signature
   * would hammer the RPC until the timeout expires.
   */
  pollIntervalMs?: number;
  /**
   * Rejects without further polling when the caller's own `AbortSignal`
   * fires. An aborted confirmation rejects with the signal's reason (an
   * `AbortError` by default) rather than a timeout error.
   */
  abortSignal?: AbortSignal;
  /**
   * Pass `true` to search transaction history when the signature may have
   * left the recent status cache. Defaults to `false`: an older signature
   * never appears in `getSignatureStatuses` results, so confirming one
   * without this flag resolves to `TRANSACTION_NOT_FOUND` after the timeout
   * rather than confirming.
   */
  searchTransactionHistory?: boolean;
}

export interface TransactionStatus {
  slot: Slot;
  confirmations: bigint | null;
  err: unknown | null;
  confirmationStatus: Commitment | null;
}

export interface TransactionConfirmation {
  signature: Signature;
  commitment: Commitment;
  status: TransactionStatus;
}
