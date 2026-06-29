import type { SolanaChain, SolanaCluster, SolanaTransaction, SolanaWalletInfo } from "../types";

export interface SolanaIosWalletAppIdentity {
  name: string;
  uri: string;
  icon?: string;
}

export interface GetSolanaIosWalletsOptions {
  appIdentity?: SolanaIosWalletAppIdentity;
  redirectUrl?: string;
  chains?: readonly SolanaChain[];
  cluster?: SolanaCluster;
}

export interface AdaptSolanaIosWalletOptions {
  appIdentity?: SolanaIosWalletAppIdentity;
  redirectUrl?: string;
  chain?: SolanaChain;
  cluster?: SolanaCluster;
  onChange?: () => void;
}

export interface IosWalletDefinition {
  id: string;
  name: string;
  icon: string;
  appUrl: string;
  installUrl: string;
  encryptionPublicKeyParam: string;
  connectUrl: string;
  signTransactionUrl?: string;
  signAllTransactionsUrl?: string;
  signAndSendTransactionUrl?: string;
}

export interface PendingIosWalletRequest {
  id: string;
  walletId: string;
  method: IosWalletMethod;
  dappEncryptionPublicKey: string;
  dappEncryptionSecretKey: string;
  redirectUrl: string;
  createdAt: number;
  requestedTransactionCount?: number;
}

export interface IosWalletSession {
  walletId: string;
  publicKey: string;
  session: string;
  dappEncryptionPublicKey: string;
  dappEncryptionSecretKey: string;
  walletEncryptionPublicKey: string;
  sharedSecret: string;
}

export type IosWalletMethod =
  | "connect"
  | "signTransaction"
  | "signAllTransactions"
  | "signAndSendTransaction";

export type IosWalletCallbackResult = {
  walletId: string;
  method: IosWalletMethod;
  publicKey?: string;
  signature?: string;
  transaction?: Uint8Array;
  transactions?: Uint8Array[];
};

export type IosWalletSignMethod = Exclude<IosWalletMethod, "connect">;

export type IosWalletInfo = SolanaWalletInfo & { wallet: IosWalletDefinition };

export type IosWalletTransaction = SolanaTransaction;
