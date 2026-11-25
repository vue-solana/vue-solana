import {
  estimateResourceLimitsFactory,
  getTransactionMessageComputeUnitLimit,
  getTransactionMessageComputeUnitPrice,
  getTransactionMessagePriorityFeeLamports,
  setTransactionMessageComputeUnitLimit,
  setTransactionMessageComputeUnitPrice,
  setTransactionMessagePriorityFeeLamports,
  type TransactionMessage,
} from "@solana/kit";
import { createSolanaError, normalizeSolanaError } from "./errors";
import type {
  FeeBudget,
  FeeBudgetCap,
  FeePolicy,
  FeePolicyMode,
  FeePolicySimulation,
  ResolveFeePolicyOptions,
  ResolveFeePolicyResult,
} from "./types";

export type {
  FeeBudget,
  FeeBudgetCap,
  FeePolicy,
  FeePolicyMode,
  FeePolicySimulation,
  ResolveFeePolicyOptions,
  ResolveFeePolicyResult,
} from "./types";

/** Fixed presets: Phase 1 deliberately does not read a fee market. */
export const FEE_POLICY_PRESETS: Readonly<
  Record<FeePolicyMode, Readonly<{ bufferPercent: number; priceMicroLamports: bigint }>>
> = {
  economy: { bufferPercent: 10, priceMicroLamports: 0n },
  standard: { bufferPercent: 20, priceMicroLamports: 10_000n },
  priority: { bufferPercent: 30, priceMicroLamports: 100_000n },
};

const DEFAULT_MODE: FeePolicyMode = "standard";
const DEFAULT_COMPUTE_UNIT_LIMIT = 200_000;
const MAX_COMPUTE_UNIT_LIMIT = 1_400_000;
const MICRO_LAMPORTS_PER_LAMPORT = 1_000_000n;
/** One fee-payer signature. Replaced by the simulated fee when available. */
const DEFAULT_BASE_FEE_LAMPORTS = 5_000n;

type EstimatableMessage = Parameters<ReturnType<typeof estimateResourceLimitsFactory>>[0];

/**
 * Resolve a local compute-budget policy against a transaction message.
 *
 * Pure with respect to signing/sending: it returns a new message and an
 * explainable budget. A simulation result avoids RPC work. Without one, a
 * caller-supplied client is used only for Kit's resource-limit simulation; a
 * client without `rpc.simulateTransaction` fails with
 * `MISSING_CLIENT_CAPABILITY`. Every value in the report is an estimate, and
 * caps are enforced here rather than by the network.
 */
export async function resolveFeePolicy<TMessage extends TransactionMessage>(
  message: TMessage,
  policy: FeePolicy = {},
  options: ResolveFeePolicyOptions = {},
): Promise<ResolveFeePolicyResult<TMessage>> {
  validateMessage(message);
  validatePolicy(policy);

  const mode = policy.mode ?? DEFAULT_MODE;
  const preset = FEE_POLICY_PRESETS[mode];
  const bufferPercent = policy.computeUnitBufferPercent ?? preset.bufferPercent;
  const abortSignal = options.abortSignal;
  abortSignal?.throwIfAborted();

  const { simulationResult, client } = options;
  let unitsConsumed: number | null = null;
  let source: FeeBudget["source"] = "default";

  if (simulationResult?.unitsConsumed != null) {
    unitsConsumed = normalizeUnits(
      simulationResult.unitsConsumed,
      "simulationResult.unitsConsumed",
    );
    source = "simulation";
  } else if (client) {
    unitsConsumed = await estimateUnits(client, message, abortSignal);
    source = "estimation";
  }

  const cappedBy: FeeBudgetCap[] = [];
  const rawLimit =
    unitsConsumed === null
      ? DEFAULT_COMPUTE_UNIT_LIMIT
      : Math.ceil(unitsConsumed * (1 + bufferPercent / 100));
  const computeUnitLimit = Math.min(Math.max(rawLimit, 1), MAX_COMPUTE_UNIT_LIMIT);

  if (rawLimit > MAX_COMPUTE_UNIT_LIMIT) {
    cappedBy.push("computeUnitLimit");
  }

  let price =
    policy.microLamportsPerComputeUnit === undefined
      ? preset.priceMicroLamports
      : toBigInt(policy.microLamportsPerComputeUnit, "microLamportsPerComputeUnit");
  const priceCap =
    policy.maxMicroLamportsPerComputeUnit === undefined
      ? undefined
      : toBigInt(policy.maxMicroLamportsPerComputeUnit, "maxMicroLamportsPerComputeUnit");

  if (priceCap !== undefined && price > priceCap) {
    price = priceCap;
    cappedBy.push("maxMicroLamportsPerComputeUnit");
  }

  const baseFeeLamports = estimateBaseFee(message, simulationResult, unitsConsumed);
  const priorityFeeLamports = ceilingDivide(
    price * BigInt(computeUnitLimit),
    MICRO_LAMPORTS_PER_LAMPORT,
  );
  let estimatedFeeLamports = baseFeeLamports + priorityFeeLamports;

  if (policy.maxLamports !== undefined) {
    const spendCap = toBigInt(policy.maxLamports, "maxLamports");

    if (estimatedFeeLamports > spendCap) {
      const availableForPriority = spendCap > baseFeeLamports ? spendCap - baseFeeLamports : 0n;
      const cappedPrice =
        (availableForPriority * MICRO_LAMPORTS_PER_LAMPORT) / BigInt(computeUnitLimit);

      if (cappedPrice < price) {
        price = cappedPrice;
        cappedBy.push("maxLamports");
      }
    }
  }

  const finalPriorityFee = ceilingDivide(
    price * BigInt(computeUnitLimit),
    MICRO_LAMPORTS_PER_LAMPORT,
  );
  estimatedFeeLamports = baseFeeLamports + finalPriorityFee;

  let updatedMessage = setTransactionMessageComputeUnitLimit(computeUnitLimit, message);

  try {
    updatedMessage = applyPrice(updatedMessage, price, computeUnitLimit);
  } catch (cause) {
    throw createSolanaError("INVALID_INPUT", "resolveFeePolicy: could not apply the fee policy.", {
      cause,
    });
  }

  return {
    message: updatedMessage,
    budget: {
      mode,
      computeUnitLimit,
      computeUnitPriceMicroLamports: price,
      priorityFeeLamports: finalPriorityFee,
      baseFeeLamports,
      estimatedFeeLamports,
      capped: cappedBy.length > 0,
      cappedBy: [...new Set(cappedBy)],
      unitsConsumed,
      source,
    },
  };
}

async function estimateUnits<TMessage extends TransactionMessage>(
  client: NonNullable<ResolveFeePolicyOptions["client"]>,
  message: TMessage,
  abortSignal: AbortSignal | undefined,
): Promise<number> {
  if (typeof client.rpc?.simulateTransaction !== "function") {
    throw createSolanaError(
      "MISSING_CLIENT_CAPABILITY",
      "resolveFeePolicy: `rpc.simulateTransaction` is required to estimate compute units, or pass a simulation result.",
      { feature: "rpc.simulateTransaction" },
    );
  }

  try {
    const estimate = estimateResourceLimitsFactory({
      rpc: client.rpc as Parameters<typeof estimateResourceLimitsFactory>[0]["rpc"],
    });
    const result = await estimate(message as EstimatableMessage, { abortSignal });

    return normalizeUnits(result.computeUnitLimit, "compute unit estimate");
  } catch (cause) {
    if (abortSignal?.aborted) {
      throw abortSignal.reason ?? cause;
    }

    if (isAbortErrorLike(cause)) {
      throw cause;
    }

    throw normalizeSolanaError(cause, "RPC_FAILURE");
  }
}

function applyPrice<TMessage extends TransactionMessage>(
  message: TMessage,
  price: bigint,
  computeUnitLimit: number,
): TMessage {
  if (message.version === 1) {
    return setTransactionMessagePriorityFeeLamports(
      ceilingDivide(price * BigInt(computeUnitLimit), MICRO_LAMPORTS_PER_LAMPORT),
      message as Extract<TMessage, { version: 1 }>,
    ) as TMessage;
  }

  return setTransactionMessageComputeUnitPrice(
    price,
    message as Extract<TMessage, { version: "legacy" | 0 }>,
  ) as TMessage;
}

/**
 * Simulation `fee` already includes any priority fee paid by the simulated
 * message, so subtract the old priority fee before using it as a base-fee
 * estimate. Without a simulated fee, assume one signature at 5,000 lamports.
 */
function estimateBaseFee(
  message: TransactionMessage,
  simulation: FeePolicySimulation | null | undefined,
  unitsConsumed: number | null,
): bigint {
  if (simulation?.fee == null) {
    return DEFAULT_BASE_FEE_LAMPORTS;
  }

  const oldLimit = getTransactionMessageComputeUnitLimit(message) ?? unitsConsumed ?? 0;
  const oldPrice = getOldPrice(message);
  const oldPriorityFee = ceilingDivide(
    oldPrice * BigInt(Math.max(oldLimit, 0)),
    MICRO_LAMPORTS_PER_LAMPORT,
  );

  return simulation.fee > oldPriorityFee ? simulation.fee - oldPriorityFee : 0n;
}

function getOldPrice(message: TransactionMessage): bigint {
  if (message.version === 1) {
    return (
      getTransactionMessagePriorityFeeLamports(
        message as Extract<TransactionMessage, { version: 1 }>,
      ) ?? 0n
    );
  }

  return (
    getTransactionMessageComputeUnitPrice(
      message as Extract<TransactionMessage, { version: "legacy" | 0 }>,
    ) ?? 0n
  );
}

function validateMessage(message: unknown): asserts message is TransactionMessage {
  if (
    typeof message !== "object" ||
    message === null ||
    !Array.isArray((message as { instructions?: unknown }).instructions) ||
    !["legacy", 0, 1].includes((message as { version?: unknown }).version as never)
  ) {
    throw createSolanaError(
      "INVALID_INPUT",
      "resolveFeePolicy: `message` must be a Kit transaction message.",
    );
  }
}

function validatePolicy(policy: unknown): asserts policy is FeePolicy {
  if (typeof policy !== "object" || policy === null) {
    throw createSolanaError("INVALID_INPUT", "resolveFeePolicy: `policy` must be an object.");
  }

  const raw = policy as Record<string, unknown>;

  if (
    raw.mode !== undefined &&
    (typeof raw.mode !== "string" || !Object.hasOwn(FEE_POLICY_PRESETS, raw.mode))
  ) {
    throw createSolanaError(
      "INVALID_INPUT",
      "resolveFeePolicy: `mode` must be `economy`, `standard`, or `priority`.",
    );
  }

  for (const field of [
    "maxLamports",
    "maxMicroLamportsPerComputeUnit",
    "microLamportsPerComputeUnit",
  ] as const) {
    if (raw[field] !== undefined) {
      toBigInt(raw[field], field);
    }
  }

  const buffer = raw.computeUnitBufferPercent;

  if (
    buffer !== undefined &&
    (typeof buffer !== "number" || !Number.isInteger(buffer) || buffer < 0 || buffer > 100)
  ) {
    throw createSolanaError(
      "INVALID_INPUT",
      "resolveFeePolicy: `computeUnitBufferPercent` must be an integer from 0 to 100.",
    );
  }
}

function toBigInt(value: unknown, field: string): bigint {
  if (typeof value === "bigint" && value >= 0n) {
    return value;
  }

  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) {
    return BigInt(value);
  }

  throw createSolanaError(
    "INVALID_INPUT",
    `resolveFeePolicy: \`${field}\` must be a non-negative safe integer or bigint.`,
  );
}

function normalizeUnits(value: unknown, field: string): number {
  const units = Number(value);

  if (!Number.isFinite(units) || units < 0 || units > Number.MAX_SAFE_INTEGER) {
    throw createSolanaError("INVALID_INPUT", `resolveFeePolicy: invalid ${field}.`);
  }

  return units;
}

function ceilingDivide(value: bigint, divisor: bigint): bigint {
  return (value + divisor - 1n) / divisor;
}

function isAbortErrorLike(cause: unknown): boolean {
  return (
    typeof cause === "object" &&
    cause !== null &&
    (cause as { name?: unknown }).name === "AbortError"
  );
}
