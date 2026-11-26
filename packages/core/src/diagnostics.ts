import { createSolanaError, isSolanaError } from "./errors";
import type { Address } from "./kit";
import type {
  DiagnosticOutcome,
  DiagnosticProgram,
  DiagnosticProgramLabels,
  FeeBudget,
  SimulatedBalanceChange,
  SimulatedTransactionResult,
  TransactionDiagnosticInput,
  TransactionDiagnosticReport,
  TransactionHistoryItem,
} from "./types";

type DiagnosticSource = NonNullable<TransactionDiagnosticReport["sources"][number]>;

interface ErrorDetails {
  code: string;
  message: string;
  raw: unknown;
}

/** Stable suggestions for this package's codes and raw RPC error keys. */
const ERROR_SUGGESTIONS: Readonly<Record<string, string>> = {
  TRANSACTION_FAILED: "Inspect the logs.",
  TRANSACTION_NOT_FOUND: "Verify signature.",
  TRANSACTION_TIMEOUT: "Check status again before resubmitting.",
  RPC_FAILURE: "Retry RPC read.",
  INVALID_INPUT: "Check inputs.",
  USER_REJECTED: "Wallet rejected.",
  MISSING_CLIENT_CAPABILITY: "Use a Kit client",
  AccountNotFound: "Check account.",
  AlreadyProcessed: "Already processed.",
  BlockhashNotFound: "Use a fresh blockhash; the old one expired.",
  ComputeBudgetExceeded: "Raise limit.",
  InsufficientFundsForFee: "Fund payer.",
  InstructionError: "Inspect simulation logs.",
  InvalidAccountData: "Check account data.",
  TooManyAccountLocks: "Retry later.",
};

const LOG_PROGRAM_PATTERN = /\bProgram\s+([1-9A-HJ-NP-Za-km-z]{32,44})\b/g;
const COMPUTE_BUDGET_LOG_PATTERN = /compute budget.*(?:exceed|exhaust|out of)/i;

/** Pure, RPC-free join of already-available transaction data. */
export function buildDiagnosticReport(
  input: TransactionDiagnosticInput,
): TransactionDiagnosticReport {
  validateInput(input);

  const sources: DiagnosticSource[] = [];
  const historyItem = input.historyItem ?? null;
  const simulationResult = input.simulationResult ?? null;
  const feeBudget = input.feeBudget ?? null;
  const labels = input.labels ?? null;

  if (historyItem) {
    sources.push("history");
  }
  if (simulationResult) {
    sources.push("simulation");
  }
  if (input.error) {
    sources.push("error");
  }
  if (feeBudget) {
    sources.push("feeBudget");
  }
  if (labels) {
    sources.push("labels");
  }

  const signature = historyItem?.signature ?? input.signature ?? null;
  const logs = [...(simulationResult?.logs ?? [])];
  const programs = collectPrograms(logs, labels);
  const primaryError = selectError(input.error, historyItem, simulationResult);
  const outcome: DiagnosticOutcome = primaryError
    ? "failed"
    : historyItem || simulationResult
      ? "succeeded"
      : "unknown";

  return {
    summary: makeSummary(outcome, signature, primaryError),
    code: primaryError?.code ?? "UNKNOWN",
    outcome,
    signature,
    slot: historyItem?.slot ?? null,
    logs,
    balanceChanges: [...(simulationResult?.balanceChanges ?? [])] as SimulatedBalanceChange[],
    unitsConsumed: toUnits(simulationResult),
    feeBudget,
    programs,
    sources,
    suggestions: collectSuggestions({
      primaryError,
      simulationResult,
      feeBudget,
      logs,
      programs,
      labels,
    }),
  };
}

export const createTransactionDiagnostics = buildDiagnosticReport;

function validateInput(input: TransactionDiagnosticInput): void {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw createSolanaError("INVALID_INPUT", "input must be an object");
  }

  if (
    input.signature !== undefined &&
    input.signature !== null &&
    typeof input.signature !== "string"
  ) {
    throw createSolanaError("INVALID_INPUT", "signature must be a string");
  }

  for (const name of ["historyItem", "simulationResult", "feeBudget"] as const) {
    assertOptionalObject(input[name], name);
  }

  if (input.feeBudget) {
    const { capped, cappedBy } = input.feeBudget;

    if (typeof capped !== "boolean" || !Array.isArray(cappedBy)) {
      throw createSolanaError("INVALID_INPUT", "invalid feeBudget");
    }
  }

  if (input.labels !== undefined && input.labels !== null) {
    assertOptionalObject(input.labels, "labels");

    for (const [address, label] of Object.entries(input.labels)) {
      if (typeof label !== "string") {
        throw createSolanaError("INVALID_INPUT", `label for ${address} must be a string`);
      }
    }
  }
}

function assertOptionalObject(value: unknown, name: string): void {
  if (value === undefined || value === null) return;

  if (typeof value !== "object" || Array.isArray(value)) {
    throw createSolanaError("INVALID_INPUT", `${name} must be an object`);
  }
}

/** Prefer the app's error, then the landed transaction, then simulation. */
function selectError(
  errorSource: unknown,
  historyItem: TransactionHistoryItem | null,
  simulationResult: SimulatedTransactionResult | null,
): ErrorDetails | null {
  if (isSolanaError(errorSource)) {
    return { code: errorSource.code, message: errorSource.message, raw: errorSource };
  }

  const raw = errorSource || historyItem?.err || simulationResult?.err || null;

  if (raw === null || raw === undefined) return null;

  return describeRawError(raw);
}

/** Preserve a known code, a raw RPC error key, or an unknown code verbatim. */
function describeRawError(raw: unknown): ErrorDetails {
  if (typeof raw === "string") {
    return { code: raw, message: raw, raw };
  }

  if (raw instanceof Error) {
    return { code: "UNKNOWN", message: raw.message, raw };
  }

  if (typeof raw === "object" && raw !== null) {
    const record = raw as Record<string, unknown>;
    const code =
      typeof record.code === "string" ? record.code : (Object.keys(record)[0] ?? "UNKNOWN");
    const message = typeof record.message === "string" ? record.message : code;

    return { code, message, raw };
  }

  return { code: "UNKNOWN", message: String(raw), raw };
}

function makeSummary(
  outcome: DiagnosticOutcome,
  signature: string | null,
  error: ErrorDetails | null,
): string {
  const subject = signature ? `Transaction ${signature}` : "Transaction";

  if (outcome === "failed" && error) return `${subject} failed: ${error.message}`;
  if (outcome === "succeeded") return `${subject} has no error`;

  return "No transaction failure data is available";
}

function toUnits(simulationResult: SimulatedTransactionResult | null): number | null {
  const units = simulationResult?.unitsConsumed;

  if (units === null || units === undefined) {
    return null;
  }

  const value = Number(units);

  return Number.isFinite(value) ? value : null;
}

function collectPrograms(
  logs: readonly string[],
  labels: DiagnosticProgramLabels | null,
): DiagnosticProgram[] {
  const programs: DiagnosticProgram[] = [];
  const seen = new Set<string>();

  for (const line of logs) {
    for (const match of line.matchAll(LOG_PROGRAM_PATTERN)) {
      const address = match[1];

      if (!address || seen.has(address)) {
        continue;
      }

      seen.add(address);
      const label = labels?.[address];
      const programAddress = address as Address;

      programs.push(label ? { address: programAddress, label } : { address: programAddress });
    }
  }

  return programs;
}

interface SuggestionContext {
  primaryError: ErrorDetails | null;
  simulationResult: SimulatedTransactionResult | null;
  feeBudget: FeeBudget | null;
  logs: readonly string[];
  programs: readonly DiagnosticProgram[];
  labels: DiagnosticProgramLabels | null;
}

function collectSuggestions(context: SuggestionContext): string[] {
  const suggestions: string[] = [];
  const { primaryError, simulationResult, feeBudget, logs, programs, labels } = context;

  if (primaryError) {
    if (Object.hasOwn(ERROR_SUGGESTIONS, primaryError.code)) {
      addSuggestion(suggestions, ERROR_SUGGESTIONS[primaryError.code]);
    }

    addSuggestion(suggestions, customErrorSuggestion(primaryError.raw, programs));
  }

  if (primaryError && logs.some((line) => COMPUTE_BUDGET_LOG_PATTERN.test(line))) {
    addSuggestion(suggestions, "Compute budget exhausted; check limit.");
  }

  if (feeBudget?.capped) {
    addSuggestion(
      suggestions,
      `Fee cap applied (${feeBudget.cappedBy.join(", ") || "cap"}); confirm.`,
    );
  }

  if (simulationResult && !primaryError && logs.length > 0) {
    addSuggestion(suggestions, "Simulation logs available.");
  }

  if (labels && Object.keys(labels).length > 0 && programs.length > 0) {
    addSuggestion(suggestions, "Use app-supplied labels.");
  }

  return suggestions;
}

function customErrorSuggestion(
  raw: unknown,
  programs: readonly DiagnosticProgram[],
): string | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const cause = record.cause as Record<string, unknown> | undefined;
  const instructionError = cause?.InstructionError ?? record.InstructionError;

  if (!Array.isArray(instructionError)) {
    return null;
  }

  const [, detail] = instructionError;
  const custom =
    typeof detail === "object" && detail !== null
      ? (detail as Record<string, unknown>).Custom
      : undefined;

  if (typeof custom !== "number" && typeof custom !== "bigint") {
    return null;
  }

  const program = programs.length === 1 ? programs[0] : undefined;
  const subject = program?.label ?? "the failing program";

  return `custom code ${custom} from ${subject} (instruction ${String(instructionError[0])})`;
}

function addSuggestion(suggestions: string[], suggestion: string | null | undefined): void {
  if (suggestion && !suggestions.includes(suggestion)) suggestions.push(suggestion);
}
