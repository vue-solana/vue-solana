import {
  createTransactionMessage,
  getTransactionMessageComputeUnitLimit,
  getTransactionMessageComputeUnitPrice,
  getTransactionMessagePriorityFeeLamports,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
  type Blockhash,
  type TransactionMessage,
} from "@solana/kit";
import { describe, expect, it } from "vitest";
import { resolveFeePolicy } from "./fee-policy";
import type { SolanaClient } from "./kit";

const PAYER = "11111111111111111111111111111111" as Address;
const BLOCKHASH = "11111111111111111111111111111111" as Blockhash;

function makeMessage(version: 0 | 1 = 0): TransactionMessage {
  const withFeePayer = setTransactionMessageFeePayer(PAYER, createTransactionMessage({ version }));

  return setTransactionMessageLifetimeUsingBlockhash(
    { blockhash: BLOCKHASH, lastValidBlockHeight: 100n },
    withFeePayer,
  );
}

function priceOf(message: TransactionMessage): bigint | undefined {
  return getTransactionMessageComputeUnitPrice(
    message as Extract<TransactionMessage, { version: 0 | "legacy" }>,
  );
}

describe("resolveFeePolicy", () => {
  it("applies the standard preset from simulation output", async () => {
    const result = await resolveFeePolicy(
      makeMessage(),
      {},
      {
        simulationResult: { unitsConsumed: 1_000n, fee: 5_000n },
      },
    );

    expect(result.budget).toMatchObject({
      mode: "standard",
      computeUnitLimit: 1_200,
      computeUnitPriceMicroLamports: 10_000n,
      priorityFeeLamports: 12n,
      baseFeeLamports: 5_000n,
      estimatedFeeLamports: 5_012n,
      capped: false,
      unitsConsumed: 1_000,
      source: "simulation",
    });
    expect(getTransactionMessageComputeUnitLimit(result.message)).toBe(1_200);
    expect(priceOf(result.message)).toBe(10_000n);
  });

  it("supports the economy and priority presets", async () => {
    const economy = await resolveFeePolicy(
      makeMessage(),
      { mode: "economy" },
      {
        simulationResult: { unitsConsumed: 1_000n, fee: null },
      },
    );
    const priority = await resolveFeePolicy(
      makeMessage(),
      { mode: "priority" },
      {
        simulationResult: { unitsConsumed: 1_000n, fee: null },
      },
    );

    expect(economy.budget.computeUnitPriceMicroLamports).toBe(0n);
    expect(economy.budget.computeUnitLimit).toBe(1_100);
    expect(priority.budget.computeUnitPriceMicroLamports).toBe(100_000n);
    expect(priority.budget.computeUnitLimit).toBe(1_300);
  });

  it("uses a custom buffer percent and a default limit without units", async () => {
    const result = await resolveFeePolicy(makeMessage(), { computeUnitBufferPercent: 50 }, {});

    expect(result.budget.computeUnitLimit).toBe(200_000);
    expect(result.budget.unitsConsumed).toBeNull();
    expect(result.budget.source).toBe("default");
  });

  it("caps the price per compute unit", async () => {
    const result = await resolveFeePolicy(
      makeMessage(),
      { mode: "priority", maxMicroLamportsPerComputeUnit: 50_000n },
      { simulationResult: { unitsConsumed: 1_000n, fee: 5_000n } },
    );

    expect(result.budget.computeUnitPriceMicroLamports).toBe(50_000n);
    expect(result.budget.capped).toBe(true);
    expect(result.budget.cappedBy).toContain("maxMicroLamportsPerComputeUnit");
    expect(priceOf(result.message)).toBe(50_000n);
  });

  it("caps total spend by lowering the priority fee", async () => {
    const result = await resolveFeePolicy(
      makeMessage(),
      { mode: "priority", computeUnitBufferPercent: 0, maxLamports: 5_050 },
      { simulationResult: { unitsConsumed: 1_000n, fee: 5_000n } },
    );

    expect(result.budget.computeUnitPriceMicroLamports).toBe(50_000n);
    expect(result.budget.priorityFeeLamports).toBe(50n);
    expect(result.budget.estimatedFeeLamports).toBe(5_050n);
    expect(result.budget.cappedBy).toContain("maxLamports");
  });

  it("reports an over-cap estimate when the base fee alone exceeds the cap", async () => {
    const result = await resolveFeePolicy(
      makeMessage(),
      { maxLamports: 10n },
      { simulationResult: { unitsConsumed: 1_000n, fee: 5_000n } },
    );

    expect(result.budget.computeUnitPriceMicroLamports).toBe(0n);
    expect(result.budget.estimatedFeeLamports).toBe(5_000n);
    expect(result.budget.capped).toBe(true);
    expect(result.budget.cappedBy).toContain("maxLamports");
  });

  it("caps the compute unit limit at the chain maximum", async () => {
    const result = await resolveFeePolicy(
      makeMessage(),
      { computeUnitBufferPercent: 100 },
      { simulationResult: { unitsConsumed: 1_000_000n, fee: null } },
    );

    expect(result.budget.computeUnitLimit).toBe(1_400_000);
    expect(result.budget.cappedBy).toContain("computeUnitLimit");
  });

  it("uses a total priority fee for v1 messages", async () => {
    const result = await resolveFeePolicy(
      makeMessage(1),
      {},
      {
        simulationResult: { unitsConsumed: 1_000n, fee: null },
      },
    );

    expect(getTransactionMessageComputeUnitLimit(result.message)).toBe(1_200);
    expect(getTransactionMessagePriorityFeeLamports(result.message as never)).toBe(12n);
  });

  it("rejects malformed messages and policies with INVALID_INPUT", async () => {
    await expect(resolveFeePolicy({} as TransactionMessage)).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
    await expect(resolveFeePolicy(makeMessage(), null as never)).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
    await expect(resolveFeePolicy(makeMessage(), { mode: "ultra" as never })).rejects.toMatchObject(
      {
        code: "INVALID_INPUT",
      },
    );
    await expect(
      resolveFeePolicy(makeMessage(), { mode: "toString" as never }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(resolveFeePolicy(makeMessage(), { maxLamports: -1 })).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
    await expect(
      resolveFeePolicy(makeMessage(), { computeUnitBufferPercent: 101 }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("requires a simulation capability when estimating", async () => {
    const client = { rpc: {} } as unknown as SolanaClient;

    await expect(resolveFeePolicy(makeMessage(), {}, { client })).rejects.toMatchObject({
      code: "MISSING_CLIENT_CAPABILITY",
      feature: "rpc.simulateTransaction",
    });
  });

  it("normalizes transport failures from estimation to RPC_FAILURE", async () => {
    const client = {
      rpc: {
        simulateTransaction: () => ({
          send: () => Promise.reject(new Error("rpc unavailable")),
        }),
      },
    } as unknown as SolanaClient;

    await expect(resolveFeePolicy(makeMessage(), {}, { client })).rejects.toMatchObject({
      code: "RPC_FAILURE",
      cause: expect.objectContaining({
        cause: expect.objectContaining({ message: "rpc unavailable" }),
      }),
    });
  });

  it("honors an aborted signal", async () => {
    const abortSignal = AbortSignal.abort(new Error("cancelled"));

    await expect(
      resolveFeePolicy(
        makeMessage(),
        {},
        {
          simulationResult: { unitsConsumed: 1_000n, fee: null },
          abortSignal,
        },
      ),
    ).rejects.toThrow("cancelled");
  });
});
