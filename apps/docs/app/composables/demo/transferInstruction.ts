import { AccountRole, address, type Address } from "@vue-solana/nuxt/kit";

const SYSTEM_PROGRAM_ADDRESS = address("11111111111111111111111111111111");

export function createTransferInstruction(
  fromPubkey: Address,
  toPubkey: Address,
  lamports: number | bigint,
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

const MEMO_PROGRAM_ADDRESS: Address = address("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export interface SolanaPayTransfer {
  payer: Address;
  recipient: Address;
  lamports: bigint;
  references?: readonly Address[];
  memo?: string;
}

/**
 * The instructions a wallet builds for a Solana Pay SOL transfer request: an
 * optional memo first, then the transfer with each reference appended as a
 * read-only account, which is what lets the merchant find the payment.
 */
export function createSolanaPayTransferInstructions({
  payer,
  recipient,
  lamports,
  references = [],
  memo,
}: SolanaPayTransfer) {
  const transfer = createTransferInstruction(payer, recipient, lamports);
  const instructions: Array<{
    programAddress: Address;
    accounts: Array<{ address: Address; role: AccountRole }>;
    data: Uint8Array;
  }> = [
    {
      ...transfer,
      accounts: [
        ...transfer.accounts,
        ...references.map((reference) => ({ address: reference, role: AccountRole.READONLY })),
      ],
    },
  ];

  if (memo) {
    instructions.unshift({
      programAddress: MEMO_PROGRAM_ADDRESS,
      accounts: [],
      data: new TextEncoder().encode(memo),
    });
  }

  return instructions;
}
