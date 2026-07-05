declare module "@solana/web3-compat" {
  export type {
    AccountInfo,
    Commitment,
    RpcResponseAndContext,
    SendOptions,
    SignatureResult,
    SignatureStatus,
    TransactionSignature,
  } from "@solana/web3.js";
  export {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction,
    VersionedTransaction,
  } from "@solana/web3.js";
}
