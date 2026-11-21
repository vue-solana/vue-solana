import type { Address, Signature, UnixTimestamp } from "@solana/kit";
import { describe, expect, it, vi } from "vitest";
import { SolanaError } from "./errors";
import type { SolanaClient } from "./kit";
import { getTransactionHistory } from "./transaction-history";

const ADDRESS = "11111111111111111111111111111111" as Address;
const SIGNATURE_1 = "sig-1" as Signature;
const SIGNATURE_2 = "sig-2" as Signature;
const SIGNATURE_3 = "sig-3" as Signature;

function historyItem(signature: Signature, overrides: Record<string, unknown> = {}) {
  return {
    signature,
    slot: 100n,
    blockTime: 123n as UnixTimestamp,
    err: null,
    memo: "memo",
    confirmationStatus: "confirmed" as const,
    ...overrides,
  };
}

function createClient(response: unknown[] = []) {
  const send = vi.fn().mockResolvedValue(response);
  const getSignaturesForAddress = vi.fn(() => ({ send }));

  return {
    send,
    rpc: { getSignaturesForAddress },
    rpcSubscriptions: {},
  } as unknown as SolanaClient & {
    send: ReturnType<typeof vi.fn>;
    rpc: { getSignaturesForAddress: ReturnType<typeof vi.fn> };
  };
}

describe("getTransactionHistory", () => {
  it("passes the parsed address and options to the RPC and normalizes a full page", async () => {
    const client = createClient([
      historyItem(SIGNATURE_1),
      historyItem(SIGNATURE_2, { blockTime: null, memo: null, confirmationStatus: null }),
    ]);
    const abortSignal = new AbortController().signal;

    const result = await getTransactionHistory(client, ADDRESS, {
      before: SIGNATURE_3,
      until: SIGNATURE_1,
      limit: 2,
      commitment: "finalized",
      abortSignal,
    });

    expect(client.rpc.getSignaturesForAddress).toHaveBeenCalledWith(ADDRESS, {
      before: SIGNATURE_3,
      until: SIGNATURE_1,
      limit: 2,
      commitment: "finalized",
    });
    expect(client.send).toHaveBeenCalledWith({ abortSignal });
    expect(result.items).toEqual([
      {
        signature: SIGNATURE_1,
        slot: 100n,
        blockTime: 123n,
        err: null,
        memo: "memo",
        confirmationStatus: "confirmed",
      },
      { signature: SIGNATURE_2, slot: 100n, err: null },
    ]);
    expect(result.hasMore).toBe(true);
    expect(result.nextBefore).toBe(SIGNATURE_2);
  });

  it("uses a 50-item default page and reports no more pages for a partial result", async () => {
    const client = createClient([historyItem(SIGNATURE_1)]);

    const result = await getTransactionHistory(client, ADDRESS);

    expect(client.rpc.getSignaturesForAddress).toHaveBeenCalledWith(ADDRESS, {
      before: undefined,
      until: undefined,
      limit: 50,
      commitment: undefined,
    });
    expect(result.hasMore).toBe(false);
    expect(result.nextBefore).toBeUndefined();
  });

  it("returns an empty result without a cursor", async () => {
    const client = createClient([]);

    await expect(getTransactionHistory(client, ADDRESS)).resolves.toEqual({
      items: [],
      hasMore: false,
    });
  });

  it("does not fetch transaction bodies", async () => {
    const client = createClient([historyItem(SIGNATURE_1)]);

    await getTransactionHistory(client, ADDRESS);

    expect(Object.keys(client.rpc)).toEqual(["getSignaturesForAddress"]);
  });

  it.each([0, -1, 1.5, 1001, Number.NaN])("rejects invalid limit %s", async (limit) => {
    const client = createClient();

    await expect(getTransactionHistory(client, ADDRESS, { limit })).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
    expect(client.rpc.getSignaturesForAddress).not.toHaveBeenCalled();
  });

  it.each([null, 42, "limit=1"])("rejects invalid options %s", async (options) => {
    const client = createClient();

    await expect(getTransactionHistory(client, ADDRESS, options as never)).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
    expect(client.rpc.getSignaturesForAddress).not.toHaveBeenCalled();
  });

  it("rejects an invalid address before reaching the RPC", async () => {
    const client = createClient();

    await expect(getTransactionHistory(client, "not-an-address")).rejects.toMatchObject({
      code: "INVALID_ADDRESS",
    });
    expect(client.rpc.getSignaturesForAddress).not.toHaveBeenCalled();
  });

  it("rejects a missing address before reaching the RPC", async () => {
    const client = createClient();

    await expect(getTransactionHistory(client, null)).rejects.toMatchObject({
      code: "INVALID_ADDRESS",
    });
    expect(client.rpc.getSignaturesForAddress).not.toHaveBeenCalled();
  });

  it("normalizes transport failures as RPC_FAILURE", async () => {
    const client = createClient();
    client.send.mockRejectedValue(new Error("rpc down"));

    await expect(getTransactionHistory(client, ADDRESS)).rejects.toMatchObject({
      code: "RPC_FAILURE",
      message: "rpc down",
    });
  });

  it("preserves an existing SolanaError", async () => {
    const error = new SolanaError("RPC_FAILURE", "original");
    const client = createClient();
    client.send.mockRejectedValue(error);

    await expect(getTransactionHistory(client, ADDRESS)).rejects.toBe(error);
  });

  it("rethrows an already-aborted signal reason", async () => {
    const reason = new Error("cancelled");
    const controller = new AbortController();
    controller.abort(reason);
    const client = createClient();

    await expect(
      getTransactionHistory(client, ADDRESS, { abortSignal: controller.signal }),
    ).rejects.toBe(reason);
    expect(client.rpc.getSignaturesForAddress).not.toHaveBeenCalled();
  });

  it("rethrows an abort reason when the RPC aborts mid-flight", async () => {
    const reason = new Error("cancelled mid-flight");
    const controller = new AbortController();
    const client = createClient();
    client.send.mockImplementation(async () => {
      controller.abort(reason);
      const error = new Error("Aborted");
      error.name = "AbortError";
      throw error;
    });

    await expect(
      getTransactionHistory(client, ADDRESS, { abortSignal: controller.signal }),
    ).rejects.toBe(reason);
  });
});
