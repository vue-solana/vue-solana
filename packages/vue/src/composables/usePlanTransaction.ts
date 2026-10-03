import type {
  InstructionPlanInput,
  TransactionMessage,
  TransactionPlan,
} from "@vue-solana/core/kit";
import { useClientAction, type ClientActionConfig } from "./client-action";

export type PlanTransactionStatus = "idle" | "planning" | "planned" | "error";

export type PlanTransactionConfig = ClientActionConfig;

const PLANNING_PROVIDER_HINT =
  "Install a planner plugin, e.g. `createClient().use(rpcTransactionPlanner())` from " +
  "`@solana/kit-plugin-rpc`, and plan with a client that has a `payer` signer — " +
  "Kit reads `client.payer` to set the fee payer.";

const PLAN_STATUSES = {
  error: "error",
  idle: "idle",
  success: "planned",
  working: "planning",
} as const satisfies Record<string, PlanTransactionStatus>;

/**
 * Plan a single transaction message from instruction inputs — without
 * signing or sending — using the client's transaction planning capability
 * (e.g. `rpcTransactionPlanner` from `@solana/kit-plugin-rpc`).
 *
 * Throws with a clear capability error when the client does not plan, which
 * includes a client without a `payer` signer.
 *
 * Calling `execute` while a prior execution is in flight aborts the prior call;
 * the superseded attempt rejects, so check its `error.cause` to tell it apart
 * from a real failure.
 */
export function usePlanTransaction() {
  const { data: transactionMessage, ...rest } = useClientAction<
    InstructionPlanInput,
    TransactionMessage,
    PlanTransactionStatus
  >({
    capability: "planTransaction",
    hookName: "usePlanTransaction",
    providerHint: PLANNING_PROVIDER_HINT,
    statuses: PLAN_STATUSES,
  });

  return { transactionMessage, ...rest };
}

/**
 * Plan a full transaction plan — possibly multiple transaction messages —
 * from instruction inputs, using the client's transaction planning
 * capability.
 *
 * Throws with a clear capability error when the client does not plan, which
 * includes a client without a `payer` signer.
 */
export function usePlanTransactions() {
  const { data: transactionPlan, ...rest } = useClientAction<
    InstructionPlanInput,
    TransactionPlan,
    PlanTransactionStatus
  >({
    capability: "planTransactions",
    hookName: "usePlanTransactions",
    providerHint: PLANNING_PROVIDER_HINT,
    statuses: PLAN_STATUSES,
  });

  return { transactionPlan, ...rest };
}
