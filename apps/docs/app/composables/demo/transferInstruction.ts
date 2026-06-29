import type { PublicKey, TransactionInstruction } from "@solana/web3-compat";
import type { Web3Compat } from "./web3Compat";

export function createTransferInstruction(
  web3Compat: Web3Compat,
  fromPubkey: PublicKey,
  toPubkey: PublicKey,
  lamports: number,
): TransactionInstruction {
  const data = new Uint8Array(12);
  const view = new DataView(data.buffer);

  view.setUint32(0, 2, true);
  view.setBigUint64(4, BigInt(lamports), true);

  return new web3Compat.TransactionInstruction({
    keys: [
      { pubkey: fromPubkey, isSigner: true, isWritable: true },
      { pubkey: toPubkey, isSigner: false, isWritable: true },
    ],
    programId: new web3Compat.PublicKey("11111111111111111111111111111111"),
    data,
  });
}
