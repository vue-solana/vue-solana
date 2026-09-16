import { AccountRole, address, type Address } from "@solana/kit";

const SYSTEM_PROGRAM_ADDRESS = address("11111111111111111111111111111111");

export function createTransferInstruction(
  fromPubkey: Address,
  toPubkey: Address,
  lamports: number,
) {
  const data = new Uint8Array(12);
  const view = new DataView(data.buffer);

  view.setUint32(0, 2, true);
  view.setBigUint64(4, BigInt(lamports), true);

  return {
    programAddress: SYSTEM_PROGRAM_ADDRESS,
    accounts: [
      { address: fromPubkey, role: AccountRole.WRITABLE_SIGNER },
      { address: toPubkey, role: AccountRole.WRITABLE },
    ],
    data,
  };
}
