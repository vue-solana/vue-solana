import { buildDiagnosticReport } from "@vue-solana/core/diagnostics";
import type { SolanaError } from "@vue-solana/core/errors";
import type { Signature } from "@vue-solana/core/kit";
import type {
  DiagnosticProgramLabels,
  FeeBudget,
  SimulatedTransactionResult,
  TransactionDiagnosticReport,
  TransactionHistoryItem,
} from "@vue-solana/core/types";
import {
  getCurrentInstance,
  onMounted,
  onScopeDispose,
  shallowRef,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
  type ShallowRef,
} from "vue";
import { useExecution } from "./use-execution";

export type TransactionDiagnosticsStatus = "idle" | "building" | "built" | "error";

export interface UseTransactionDiagnosticsOptions {
  /** A history item when the primary source is only a signature. */
  historyItem?: MaybeRefOrGetter<TransactionHistoryItem | null | undefined>;
  /** Simulation output from `useSimulateTransaction()` or `simulateTransaction()`. */
  simulationResult?: MaybeRefOrGetter<SimulatedTransactionResult | null | undefined>;
  /** A normalized `SolanaError` or a raw RPC error shape. */
  error?: MaybeRefOrGetter<unknown>;
  /** An optional budget resolved by `useComputeBudget()`. */
  feeBudget?: MaybeRefOrGetter<FeeBudget | null | undefined>;
  /** App-supplied program labels; no built-in registry is shipped. */
  labels?: MaybeRefOrGetter<DiagnosticProgramLabels | null | undefined>;
  /** Build once after mount in addition to source changes. Defaults to `false`. */
  immediate?: boolean;
}

export interface UseTransactionDiagnostics {
  /** The last joined report, kept while a newer join is in flight. */
  report: ShallowRef<TransactionDiagnosticReport | null>;
  status: ShallowRef<TransactionDiagnosticsStatus>;
  error: Ref<SolanaError | null>;
  loading: ComputedRef<boolean>;
  /** Join the current sources, superseding any in-flight build. */
  refresh: () => Promise<TransactionDiagnosticReport | null>;
  reset: () => void;
}

const STATUSES = {
  error: "error",
  idle: "idle",
  success: "built",
  working: "building",
} as const satisfies Record<string, TransactionDiagnosticsStatus>;

/**
 * Join already-available transaction data into one explainable report.
 *
 * The builder is pure and RPC-free: this composable only reads reactive
 * sources and supersedes stale builds. It never fetches a transaction, signs,
 * sends, retries, or interprets instructions, memos, or token transfers.
 */
export function useTransactionDiagnostics(
  source: MaybeRefOrGetter<TransactionHistoryItem | Signature | string | null | undefined> = null,
  options: UseTransactionDiagnosticsOptions = {},
): UseTransactionDiagnostics {
  const report: ShallowRef<TransactionDiagnosticReport | null> = shallowRef(null);

  // Malformed *inputs* are INVALID_INPUT, not a transport failure. The builder
  // is pure, so no other failure mode is expected here.
  const execution = useExecution<TransactionDiagnosticsStatus>(STATUSES.working, {
    error: STATUSES.error,
    idle: STATUSES.idle,
    failureCode: "INVALID_INPUT",
  });

  function readInput(): Parameters<typeof buildDiagnosticReport>[0] {
    const primary = toValue(source);
    const historyItem = toValue(options.historyItem) ?? (isHistoryItem(primary) ? primary : null);
    const signature = typeof primary === "string" ? (primary as Signature) : null;
    const simulationResult =
      options.simulationResult === undefined ? null : toValue(options.simulationResult);
    const error = options.error === undefined ? null : toValue(options.error);
    const feeBudget = options.feeBudget === undefined ? null : toValue(options.feeBudget);
    const labels = options.labels === undefined ? null : toValue(options.labels);

    // A source that is present but currently empty is still no source. Checking
    // key presence here would build an "unknown" report for the common pattern
    // where simulation/error refs start as `null`.
    return {
      ...(historyItem ? { historyItem } : {}),
      ...(signature ? { signature } : {}),
      ...(simulationResult ? { simulationResult } : {}),
      ...(error ? { error } : {}),
      ...(feeBudget ? { feeBudget } : {}),
      ...(labels ? { labels } : {}),
    };
  }

  async function refresh(): Promise<TransactionDiagnosticReport | null> {
    const input = readInput();

    if (Object.keys(input).length === 0) {
      reset();
      return null;
    }

    return execution.execute(
      async () => buildDiagnosticReport(input),
      (result) => {
        report.value = result;
        return STATUSES.success;
      },
    );
  }

  function reset() {
    execution.reset();
    report.value = null;
  }

  watch(
    [
      () => toValue(source),
      () => (options.historyItem !== undefined ? toValue(options.historyItem) : undefined),
      () =>
        options.simulationResult !== undefined ? toValue(options.simulationResult) : undefined,
      () => (options.error !== undefined ? toValue(options.error) : undefined),
      () => (options.feeBudget !== undefined ? toValue(options.feeBudget) : undefined),
      () => (options.labels !== undefined ? toValue(options.labels) : undefined),
    ],
    () => {
      void refresh().catch(() => undefined);
    },
  );

  // SSR must stay inert: build after mount when `immediate` is set, or only
  // when an app explicitly calls refresh(). Component-less effect scopes use
  // the direct fallback because they have no mounted lifecycle.
  if (getCurrentInstance()) {
    onMounted(() => {
      if (options.immediate) {
        void refresh().catch(() => undefined);
      }
    });
  } else if (options.immediate) {
    void refresh().catch(() => undefined);
  }

  onScopeDispose(reset);

  return {
    error: execution.error,
    loading: execution.loading,
    refresh,
    report,
    reset,
    status: execution.status,
  };
}

function isHistoryItem(value: unknown): value is TransactionHistoryItem {
  return typeof value === "object" && value !== null && "signature" in value && "slot" in value;
}
