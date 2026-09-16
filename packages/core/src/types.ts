import type { Address, Commitment, Signature, Slot } from "@solana/kit";
import type { SolanaClient } from "./kit";

export type SolanaCluster = "mainnet-beta" | "testnet" | "devnet" | "localnet";

export type SolanaChain = "solana:mainnet" | "solana:testnet" | "solana:devnet" | "solana:localnet";

export interface SolanaConfig {
  cluster?: SolanaCluster;
  endpoint?: string;
  wsEndpoint?: string;
  commitment?: Commitment;
  autoConnect?: boolean;
}

export interface SolanaContext {
  cluster: SolanaCluster;
  endpoint: string;
  wsEndpoint: string;
  client: SolanaClient;
}

export type SolanaTransaction = Uint8Array;

export interface SolanaSignMessageResult {
  signedMessage: Uint8Array;
  signature: Uint8Array;
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
  signMessage?: (message: Uint8Array) => Promise<SolanaSignMessageResult>;
  signTransaction?: (transaction: SolanaTransaction) => Promise<SolanaTransaction>;
  signAllTransactions?: (transactions: SolanaTransaction[]) => Promise<SolanaTransaction[]>;
  signAndSendTransaction?: (
    transaction: SolanaTransaction,
    options?: SendTransactionOptions,
  ) => Promise<{ signature: string }>;
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
