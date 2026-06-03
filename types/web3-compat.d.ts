declare module '@solana/web3-compat' {
  export type {
    Commitment,
    SendOptions,
    TransactionSignature
  } from '@solana/web3.js'
  export {
    clusterApiUrl,
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction,
    VersionedTransaction
  } from '@solana/web3.js'
}
