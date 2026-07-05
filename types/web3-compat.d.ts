declare module "@solana/web3-compat" {
  export type Commitment =
    | "processed"
    | "confirmed"
    | "finalized"
    | "recent"
    | "single"
    | "singleGossip"
    | "root"
    | "max";

  export type TransactionSignature = string;

  export interface SendOptions {
    skipPreflight?: boolean;
    preflightCommitment?: Commitment;
    maxRetries?: number;
    minContextSlot?: number;
  }

  export interface RpcResponseAndContext<T> {
    context: {
      slot: number;
      apiVersion?: string;
    };
    value: T;
  }

  export interface AccountInfo<TData> {
    executable: boolean;
    owner: PublicKey;
    lamports: number;
    data: TData;
    rentEpoch?: number;
  }

  export interface SignatureResult {
    err: unknown | null;
  }

  export interface SignatureStatus {
    slot: number;
    confirmations: number | null;
    err: unknown | null;
    confirmationStatus?: Commitment;
  }

  export type PublicKeyInitData =
    | PublicKey
    | string
    | Uint8Array
    | readonly number[]
    | ArrayLike<number>;

  export class PublicKey {
    constructor(value: PublicKeyInitData);
    toBase58(): string;
    toBytes(): Uint8Array;
    toBuffer(): Uint8Array;
    equals(publicKey: PublicKey): boolean;
    toString(): string;
  }

  export class Keypair {
    public publicKey: PublicKey;
    public secretKey: Uint8Array;
    static generate(): Keypair;
    static fromSecretKey(secretKey: Uint8Array): Keypair;
  }

  export class TransactionInstruction {
    constructor(options: { keys: unknown[]; programId: PublicKey; data?: Uint8Array });
  }

  export class Transaction {
    feePayer?: PublicKey;
    recentBlockhash?: string;
    constructor(options?: { feePayer?: PublicKey; recentBlockhash?: string });
    add(...instructions: TransactionInstruction[]): this;
    serialize(options?: { requireAllSignatures?: boolean; verifySignatures?: boolean }): Uint8Array;
    static from(buffer: Uint8Array): Transaction;
  }

  export class VersionedTransaction {
    serialize(): Uint8Array;
    static deserialize(buffer: Uint8Array): VersionedTransaction;
  }

  export const SystemProgram: {
    transfer(options: {
      fromPubkey: PublicKey;
      toPubkey: PublicKey;
      lamports: number;
    }): TransactionInstruction;
  };

  export class Connection {
    readonly rpcEndpoint: string;
    constructor(
      endpoint: string,
      config?: Commitment | { commitment?: Commitment; wsEndpoint?: string },
    );
    getLatestBlockhash(
      commitment?: Commitment,
    ): Promise<{ blockhash: string; lastValidBlockHeight: number }>;
    getBalance(publicKey: PublicKey, commitment?: Commitment): Promise<number>;
    getAccountInfo<TData = Uint8Array>(
      publicKey: PublicKey,
      commitment?: Commitment,
    ): Promise<AccountInfo<TData> | null>;
    getProgramAccounts(
      publicKey: PublicKey,
      config?: unknown,
    ): Promise<{ pubkey: PublicKey; account: AccountInfo<Uint8Array> }[]>;
    getSignatureStatuses(
      signatures: TransactionSignature[],
      config?: { searchTransactionHistory?: boolean },
    ): Promise<{ value: (SignatureStatus | null)[] }>;
    confirmTransaction(
      signature: TransactionSignature,
      commitment?: Commitment,
    ): Promise<RpcResponseAndContext<SignatureResult>>;
    sendRawTransaction(
      rawTransaction: Uint8Array,
      options?: SendOptions,
    ): Promise<TransactionSignature>;
    onAccountChange(
      publicKey: PublicKey,
      callback: (accountInfo: AccountInfo<Uint8Array>, context: { slot: number }) => void,
      commitment?: Commitment,
    ): number;
    removeAccountChangeListener(subscriptionId: number): Promise<void>;
    onSignature(
      signature: TransactionSignature,
      callback: (notification: SignatureResult, context: { slot: number }) => void,
      commitment?: Commitment,
    ): number;
    removeSignatureListener(subscriptionId: number): Promise<void>;
  }
}
