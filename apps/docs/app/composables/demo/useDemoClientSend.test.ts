// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref, shallowRef } from "vue";
import type { Address, Instruction } from "@solana/kit";
import { useDemoClientSend } from "./useDemoClientSend";

const PAYER_ADDRESS = "CBEbds3JhsDmxLbMSXX2GZo4vjd71xAUk4zRM8VbdoAC" as Address;

const execute = vi.fn();
const executeBatch = vi.fn();
const airdropDispatch = vi.fn();
const payer = shallowRef<{ address: Address } | undefined>({ address: PAYER_ADDRESS });

vi.stubGlobal("useSolanaSendTransaction", () => ({
  data: ref(null),
  error: ref(null),
  execute,
  status: ref("idle"),
}));
vi.stubGlobal("useSolanaSendTransactions", () => ({
  data: ref(null),
  error: ref(null),
  execute: executeBatch,
  status: ref("idle"),
}));
vi.stubGlobal("useSolanaAirdrop", () => ({
  data: ref(null),
  dispatch: airdropDispatch,
  error: ref(null),
}));
vi.stubGlobal("useSolanaPayer", () => payer);

/** The memo note carried by an instruction; it is what makes plans distinct. */
function memoNote(instruction: Instruction): string {
  return new TextDecoder().decode(instruction.data!);
}

describe("useDemoClientSend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    payer.value = { address: PAYER_ADDRESS };
  });

  it("submits a single memo instruction", async () => {
    const demo = useDemoClientSend();

    await demo.runClientSend();

    const [input] = execute.mock.calls[0] as [Instruction[]];

    expect(memoNote(input[0]!)).toBe("Hello from @vue-solana");
  });

  it("submits two distinct instructions in the batch", async () => {
    const demo = useDemoClientSend();

    await demo.runClientSendBatch();

    const [input] = executeBatch.mock.calls[0] as [Instruction[]];

    expect(input).toHaveLength(2);
    // Ed25519 is deterministic: signing the same message twice produces the
    // same signature and the network rejects the duplicate, so the batch must
    // carry two distinct instructions.
    expect(memoNote(input[0]!)).not.toBe(memoNote(input[1]!));
  });

  it("does nothing before the client payer resolves", async () => {
    payer.value = undefined;
    const demo = useDemoClientSend();

    await demo.runClientSend();
    await demo.runClientSendBatch();
    await demo.runAirdrop();

    expect(execute).not.toHaveBeenCalled();
    expect(executeBatch).not.toHaveBeenCalled();
    expect(airdropDispatch).not.toHaveBeenCalled();
  });

  it("funds the client payer that pays the fee", async () => {
    const demo = useDemoClientSend();

    await demo.runAirdrop();

    expect(airdropDispatch).toHaveBeenCalledWith(PAYER_ADDRESS, 1_000_000_000n);
  });
});
