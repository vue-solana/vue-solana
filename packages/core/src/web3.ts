/**
 * Legacy `@solana/web3-compat` re-exports kept for backward compatibility.
 *
 * @deprecated Prefer `@vue-solana/core/kit` (`Address`, `client.rpc`, and the
 * Kit transaction/signer helpers) for new code.
 */
export type {
  AccountInfo,
  Commitment,
  RpcResponseAndContext,
  SendOptions,
  SignatureResult,
  SignatureStatus,
  TransactionSignature,
} from "@solana/web3-compat";

export {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
} from "@solana/web3-compat";
