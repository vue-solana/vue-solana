import type {
  Address,
  Commitment,
  ReadonlyUint8Array,
  Signature,
  Slot,
  TokenAmount,
  TokenBalance,
  TransactionBlockhashLifetime,
  TransactionError,
  TransactionSigner,
  UnixTimestamp,
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

export interface SolanaWalletConnectOptions {
  /**
   * Restore an authorization the wallet already granted without prompting the
   * user. When there is none the wallet stays disconnected and `connect()`
   * resolves without throwing. Used by auto-connect: a prompt (or, for the
   * Android Mobile Wallet Adapter, an app launch) needs a user gesture that a
   * page load does not have.
   */
  silent?: boolean;
}

export interface SolanaWallet {
  publicKey: Address | null;
  connected: boolean;
  connecting?: boolean;
  disconnecting?: boolean;
  platform?: SolanaWalletInfo["platform"];
  source?: SolanaWalletInfo["source"];
  connect: (options?: SolanaWalletConnectOptions) => Promise<void>;
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
  /**
   * @deprecated Prefer `signTransactions` (identical signature). `signTransactions`
   * is tried first in `useSignTransactions()`; `signAllTransactions` remains as
   * the legacy Wallet Standard naming.
   */
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

export interface SimulateTransactionOptions {
  commitment?: Commitment;
  minContextSlot?: Slot;
  /**
   * Verify transaction signatures during simulation. Mutually exclusive with
   * `replaceRecentBlockhash`; setting both throws `INVALID_INPUT`.
   */
  sigVerify?: boolean;
  /**
   * Replace the transaction's blockhash with the latest one and return it in
   * `replacementBlockhash`. Mutually exclusive with `sigVerify`.
   */
  replaceRecentBlockhash?: boolean;
  abortSignal?: AbortSignal;
}

export interface SimulatedBalanceChange {
  /** Index of the account in the simulated transaction's account list. */
  accountIndex: number;
  before: bigint;
  after: bigint;
  change: bigint;
}

export interface SimulatedTokenBalanceChange {
  accountIndex: number;
  mint: Address;
  owner?: Address;
  programId?: Address;
  before: TokenAmount | null;
  after: TokenAmount | null;
  /** Delta in the token's smallest units; `null` when either side is missing. */
  change: bigint | null;
}

export interface SimulatedLoadedAddresses {
  readonly: readonly Address[];
  writable: readonly Address[];
}

export interface SimulatedTransactionResult {
  /** Simulation failure reported by the RPC. A non-null value is data, not a thrown error. */
  err: TransactionError | null;
  logs: string[] | null;
  fee: bigint | null;
  balanceChanges: readonly SimulatedBalanceChange[] | null;
  preBalances: readonly bigint[] | null;
  postBalances: readonly bigint[] | null;
  tokenBalanceChanges: readonly SimulatedTokenBalanceChange[] | null;
  preTokenBalances: readonly TokenBalance[] | null;
  postTokenBalances: readonly TokenBalance[] | null;
  loadedAddresses: SimulatedLoadedAddresses;
  loadedAccountsDataSize: number | null;
  returnData: { data: string; programId: Address } | null;
  replacementBlockhash: TransactionBlockhashLifetime | null;
  unitsConsumed: bigint | null;
}

/** `processed` is not accepted by `getSignaturesForAddress`. */
export type TransactionHistoryCommitment = Exclude<Commitment, "processed">;

export interface TransactionHistoryOptions {
  /** Page start: return signatures strictly older than this one. */
  before?: Signature;
  /** Page end: stop at this signature (inclusive). */
  until?: Signature;
  /** Signatures per page, 1–1000. Defaults to 50. */
  limit?: number;
  commitment?: TransactionHistoryCommitment;
  abortSignal?: AbortSignal;
}

export interface TransactionHistoryItem {
  signature: Signature;
  slot: Slot;
  /** Null RPC block times are omitted. */
  blockTime?: UnixTimestamp;
  err: TransactionError | null;
  /** Null RPC memos are omitted. */
  memo?: string;
  /** Null RPC confirmation statuses are omitted. */
  confirmationStatus?: Commitment;
}

export interface TransactionHistoryResult {
  /** Newest-first, in RPC order. */
  items: TransactionHistoryItem[];
  /** True when a full page was returned, meaning older pages may exist. */
  hasMore: boolean;
  /** Last signature of this page; pass it as `before` to load older items. */
  nextBefore?: Signature;
}

/** Priority tiers are fixed estimates; this library does not read a fee market. */
export type FeePolicyMode = "economy" | "standard" | "priority";

/**
 * Local policy for a compute budget. Every numeric field is optional because
 * presets supply defaults; values are estimates, never send-time guarantees.
 */
export interface FeePolicy {
  /** Defaults to `standard`. */
  mode?: FeePolicyMode;
  /**
   * Total fee ceiling in lamports (estimated base fee + priority fee), enforced
   * locally by reducing the priority fee. The network base fee cannot be capped
   * away, so a cap below the base fee still reports an over-cap estimate.
   */
  maxLamports?: bigint | number;
  /** Ceiling for the price per compute unit, in micro-lamports. */
  maxMicroLamportsPerComputeUnit?: bigint | number;
  /** Extra headroom over the observed/estimated units, from 0 to 100. */
  computeUnitBufferPercent?: number;
  /**
   * Explicit price in micro-lamports per compute unit. Overrides the preset
   * price and is still subject to the caps above.
   */
  microLamportsPerComputeUnit?: bigint | number;
}

/** The simulation fields needed to derive a fee budget. */
export type FeePolicySimulation = Pick<SimulatedTransactionResult, "unitsConsumed" | "fee">;

export interface ResolveFeePolicyOptions {
  /**
   * Optional simulation result. When supplied, no RPC call is made.
   */
  simulationResult?: FeePolicySimulation | null;
  /**
   * Used only when no simulation result is supplied. The client needs an
   * `rpc.simulateTransaction` method for Kit's resource-limit estimator.
   */
  client?: SolanaClient | null;
  abortSignal?: AbortSignal;
}

export type FeeBudgetCap = "maxLamports" | "maxMicroLamportsPerComputeUnit" | "computeUnitLimit";

/** The locally enforced budget and the estimates behind it. */
export interface FeeBudget {
  mode: FeePolicyMode;
  computeUnitLimit: number;
  computeUnitPriceMicroLamports: bigint;
  /** `price * limit / 1_000_000`, rounded up. */
  priorityFeeLamports: bigint;
  /** Simulated base fee when available, otherwise a one-signature estimate. */
  baseFeeLamports: bigint;
  estimatedFeeLamports: bigint;
  /** True when any local cap or the chain's compute-unit limit was applied. */
  capped: boolean;
  cappedBy: readonly FeeBudgetCap[];
  unitsConsumed: number | null;
  source: "simulation" | "estimation" | "default";
}

export interface ResolveFeePolicyResult<TMessage> {
  message: TMessage;
  budget: FeeBudget;
}
