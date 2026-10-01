import type {
  InstructionPlanInput,
  SingleTransactionPlan,
  SuccessfulSingleTransactionPlanResult,
  TransactionPlanInput,
  TransactionPlanResult,
} from "@vue-solana/core/kit";
import { useClientAction, type ClientActionConfig } from "./client-action";

export type SendTransactionStatus = "idle" | "sending" | "sent" | "error";

export type SendTransactionConfig = ClientActionConfig;

export type SendTransactionInput =
  | InstructionPlanInput
  | SingleTransactionPlan
  | SingleTransactionPlan["message"];

export type SendTransactionsInput = InstructionPlanInput | TransactionPlanInput;

const SENDING_PROVIDER_HINT =
  "Use a client created by `createSolanaClient({ payer })` — or any client with a `payer` signer. " +
  "Kit reads `client.payer` when it plans a transaction from an instruction plan.";

const SEND_STATUSES = {
  error: "error",
  idle: "idle",
  success: "sent",
  working: "sending",
} as const satisfies Record<string, SendTransactionStatus>;

/**
 * Plan, sign with the client's signers (payer/identity), submit, and confirm
 * a single transaction — all through the client's transaction-sending
 * capability (`ClientWithTransactionSending`), with no wallet popup.
 *
 * Accepts flexible input: instructions, an instruction plan, a transaction
 * message, or a single transaction plan.
 *
 * Throws with a clear capability error when the client cannot send, which
 * includes a client without a `payer` signer — Kit reads `client.payer` when it
 * plans a transaction, so one is always required.
 *
 * Calling `execute` while a prior execution is in flight aborts the prior call;
 * the superseded attempt rejects, so check its `error.cause` to tell it apart
 * from a real failure.
 */
export function useSendTransaction() {
  return useClientAction<
    SendTransactionInput,
    SuccessfulSingleTransactionPlanResult,
    SendTransactionStatus
  >({
    capability: "sendTransaction",
    hookName: "useSendTransaction",
    providerHint: SENDING_PROVIDER_HINT,
    statuses: SEND_STATUSES,
  });
}

/**
 * Plan, sign, submit, and confirm one or more transactions — possibly a batch
 * of messages, executed in parallel or sequentially as the plan dictates —
 * through the client's transaction-sending capability.
 *
 * Throws with a clear capability error when the client cannot send, which
 * includes a client without a `payer` signer.
 */
export function useSendTransactions() {
  return useClientAction<SendTransactionsInput, TransactionPlanResult, SendTransactionStatus>({
    capability: "sendTransactions",
    hookName: "useSendTransactions",
    providerHint: SENDING_PROVIDER_HINT,
    statuses: SEND_STATUSES,
  });
}
