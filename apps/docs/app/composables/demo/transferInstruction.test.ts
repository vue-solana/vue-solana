import { describe, expect, it } from "vitest";
import { AccountRole, address } from "@vue-solana/nuxt/kit";
import { createSolanaPayTransferInstructions } from "./transferInstruction";

const payer = address("11111111111111111111111111111112");
const recipient = address("11111111111111111111111111111113");
const reference = address("11111111111111111111111111111114");

describe("createSolanaPayTransferInstructions", () => {
  it("puts the memo first and the references on the transfer as read-only accounts", () => {
    const [memo, transfer] = createSolanaPayTransferInstructions({
      payer,
      recipient,
      lamports: 1_000_000n,
      references: [reference],
      memo: "order-1042",
    });

    expect(memo?.programAddress).toBe("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
    expect(new TextDecoder().decode(memo?.data)).toBe("order-1042");
    expect(transfer?.accounts).toEqual([
      { address: payer, role: AccountRole.WRITABLE_SIGNER },
      { address: recipient, role: AccountRole.WRITABLE },
      { address: reference, role: AccountRole.READONLY },
    ]);
    const view = new DataView(transfer!.data.buffer);
    expect(view.getUint32(0, true)).toBe(2);
    expect(view.getBigUint64(4, true)).toBe(1_000_000n);
  });

  it("sends only the transfer without a memo", () => {
    const instructions = createSolanaPayTransferInstructions({ payer, recipient, lamports: 1n });

    expect(instructions).toHaveLength(1);
    expect(instructions[0]?.programAddress).toBe("11111111111111111111111111111111");
  });
});
