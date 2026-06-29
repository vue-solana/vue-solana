import type {
  Commitment,
  Connection,
  RpcResponseAndContext,
  PublicKey,
  SendOptions,
  SignatureResult,
  Transaction,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3-compat";

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
  connection: Connection;
}

export type SolanaTransaction = Transaction | VersionedTransaction;

export interface SolanaWallet {
  publicKey: PublicKey | null;
  connected: boolean;
  connecting?: boolean;
  disconnecting?: boolean;
  platform?: SolanaWalletInfo["platform"];
  source?: SolanaWalletInfo["source"];
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signTransaction?: <T extends SolanaTransaction>(transaction: T) => Promise<T>;
  signAllTransactions?: <T extends SolanaTransaction>(transactions: T[]) => Promise<T[]>;
  signAndSendTransaction?: (
    transaction: SolanaTransaction,
    options?: SendOptions,
  ) => Promise<{ signature: TransactionSignature }>;
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

export interface SendTransactionOptions extends SendOptions {
  skipPreflight?: boolean;
}

export interface ConfirmTransactionOptions {
  commitment?: Commitment;
  timeoutMs?: number;
}

export interface TransactionConfirmation {
  signature: TransactionSignature;
  commitment: Commitment;
  result: RpcResponseAndContext<SignatureResult>;
}
