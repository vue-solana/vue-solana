// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref, shallowRef } from "vue";
import { type Address, type TransactionMessage } from "@solana/kit";
import { useDemoClientSend } from "./useDemoClientSend";

const WALLET_ADDRESS = "CBEbds3JhsDmxLbMSXX2GZo4vjd71xAUk4zRM8VbdoAC" as Address;

const execute = vi.fn();
const executeBatch = vi.fn();
const publicKey = shallowRef<Address | null>(null);
const walletValue = shallowRef<{ signTransaction: (t: Uint8Array) => Promise<Uint8Array> } | null>(
  null,
);

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
  dispatch: vi.fn(),
  error: ref(null),
}));
vi.stubGlobal("useSolanaWallet", () => ({
  publicKey,
  wallet: walletValue,
}));

/** The memo note carried by a message; it is what makes messages distinct. */
function memoNote(message: TransactionMessage): string {
  return new TextDecoder().decode(message.instructions[0]!.data);
}

describe("useDemoClientSend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    publicKey.value = WALLET_ADDRESS;
    // Echo the transaction back unchanged: the demo only cares that the
    // signature the wallet returns is threaded through.
    walletValue.value = { signTransaction: async (transaction) => transaction };
  });

  it("submits a single memo message", async () => {
    const demo = useDemoClientSend();

    await demo.runClientSend();

    const [input] = execute.mock.calls[0] as [TransactionMessage];

    expect(memoNote(input)).toBe("Hello from @vue-solana");
  });

  it("submits two distinct messages in the batch", async () => {
    const demo = useDemoClientSend();

    await demo.runClientSendBatch();

    const [input] = executeBatch.mock.calls[0] as [TransactionMessage[]];

    expect(input).toHaveLength(2);
    // Ed25519 is deterministic: signing the same message twice produces the
    // same signature and the network rejects the duplicate, so the batch must
    // carry two distinct messages.
    expect(memoNote(input[0]!)).not.toBe(memoNote(input[1]!));
  });

  it("does nothing without a connected wallet", async () => {
    publicKey.value = null;
    const demo = useDemoClientSend();

    await demo.runClientSend();
    await demo.runClientSendBatch();

    expect(execute).not.toHaveBeenCalled();
    expect(executeBatch).not.toHaveBeenCalled();
  });
});
