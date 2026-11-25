import { address, type Signature } from "@solana/kit";
import { describe, expect, it } from "vitest";
import { buildDiagnosticReport, createTransactionDiagnostics } from "./diagnostics";
import { createSolanaError } from "./errors";
import type { FeeBudget, SimulatedTransactionResult, TransactionHistoryItem } from "./types";

const SIGNATURE =
  "2Ana1pUpv2ZbMVkwF5FXapYeBEjdxDatLn7nvJkhgTSXbs59SyZSx866bXirPgj8QQVB57uxHJBG1YFvkRbFj4T" as Signature;
const PROGRAM = address("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

function history(overrides: Partial<TransactionHistoryItem> = {}): TransactionHistoryItem {
  return {
    signature: SIGNATURE,
    slot: 123_456n,
    err: null,
    ...overrides,
  };
}

function simulation(
  overrides: Partial<SimulatedTransactionResult> = {},
): SimulatedTransactionResult {
  return {
    err: null,
    logs: ["Program Memo invoke [1]"],
    fee: 5_000n,
    balanceChanges: [],
    preBalances: null,
    postBalances: null,
    tokenBalanceChanges: null,
    preTokenBalances: null,
    postTokenBalances: null,
    loadedAddresses: { readonly: [], writable: [] },
    loadedAccountsDataSize: null,
    returnData: null,
    replacementBlockhash: null,
    unitsConsumed: 150n,
    ...overrides,
  };
}

function budget(overrides: Partial<FeeBudget> = {}): FeeBudget {
  return {
    mode: "standard",
    computeUnitLimit: 180,
    computeUnitPriceMicroLamports: 10_000n,
    priorityFeeLamports: 2n,
    baseFeeLamports: 5_000n,
    estimatedFeeLamports: 5_002n,
    capped: false,
    cappedBy: [],
    unitsConsumed: 150,
    source: "simulation",
    ...overrides,
  };
}

describe("buildDiagnosticReport", () => {
  it("returns a stable empty report for empty input", () => {
    const report = buildDiagnosticReport({});

    expect(report).toMatchObject({
      summary: "No transaction failure data is available",
      code: "UNKNOWN",
      outcome: "unknown",
      signature: null,
      slot: null,
      logs: [],
      balanceChanges: [],
      unitsConsumed: null,
      feeBudget: null,
      programs: [],
      sources: [],
      suggestions: [],
    });
  });

  it("reports a successful history item without inventing an error", () => {
    const report = buildDiagnosticReport({ historyItem: history() });

    expect(report.outcome).toBe("succeeded");
    expect(report.code).toBe("UNKNOWN");
    expect(report.signature).toBe(SIGNATURE);
    expect(report.slot).toBe(123_456n);
    expect(report.sources).toEqual(["history"]);
    expect(report.summary).toContain("no error");
  });

  it("maps a raw history error and preserves its RPC key as the code", () => {
    const report = buildDiagnosticReport({
      historyItem: history({ err: { BlockhashNotFound: {} } as never }),
    });

    expect(report.outcome).toBe("failed");
    expect(report.code).toBe("BlockhashNotFound");
    expect(report.summary).toContain("failed: BlockhashNotFound");
    expect(report.suggestions).toContain(
      "The blockhash expired before the transaction landed; use a fresh blockhash.",
    );
  });

  it("joins simulation logs, balance changes, units, and a fee budget", () => {
    const balanceChanges = [{ accountIndex: 0, before: 1_000n, after: 900n, change: -100n }];
    const report = buildDiagnosticReport({
      historyItem: history({ err: { InstructionError: [0, { Custom: 7 }] } }),
      simulationResult: simulation({
        err: { InstructionError: [0, { Custom: 7 }] },
        logs: ["Program Memo invoke [1]", "Program failed: compute budget exceeded"],
        balanceChanges,
      }),
      feeBudget: budget({ capped: true, cappedBy: ["maxLamports"] }),
    });

    expect(report.outcome).toBe("failed");
    expect(report.code).toBe("InstructionError");
    expect(report.logs).toHaveLength(2);
    expect(report.balanceChanges).toEqual(balanceChanges);
    expect(report.unitsConsumed).toBe(150);
    expect(report.feeBudget?.cappedBy).toEqual(["maxLamports"]);
    expect(report.sources).toEqual(["history", "simulation", "feeBudget"]);
    expect(report.suggestions).toContainEqual(expect.stringContaining("custom code 7"));
    expect(report.suggestions).toContainEqual(expect.stringContaining("ran out of compute budget"));
    expect(report.suggestions).toContainEqual(expect.stringContaining("maxLamports"));
  });

  it("passes a normalized SolanaError code through and wins over raw errors", () => {
    const error = createSolanaError("TRANSACTION_TIMEOUT", "Timed out waiting for signature");
    const report = buildDiagnosticReport({
      error,
      historyItem: history({ err: { BlockhashNotFound: {} } as never }),
      simulationResult: simulation({ err: { AlreadyProcessed: {} } as never }),
    });

    expect(report.code).toBe("TRANSACTION_TIMEOUT");
    expect(report.summary).toContain("Timed out waiting for signature");
    expect(report.suggestions).toContain(
      "Check the signature status again before resubmitting anything.",
    );
    expect(report.suggestions).not.toContain("Already processed.");
  });

  it("reads a wrapped raw instruction error from a normalized error's cause", () => {
    const error = createSolanaError("TRANSACTION_FAILED", "Simulation failed", {
      cause: { InstructionError: [0, { Custom: 7 }] },
    });
    const report = buildDiagnosticReport({
      error,
      simulationResult: simulation({ logs: [`Program ${PROGRAM} invoke [1]`] }),
      labels: { [PROGRAM]: "Memo app" },
    });

    expect(report.code).toBe("TRANSACTION_FAILED");
    expect(report.suggestions).toContainEqual(expect.stringContaining("custom code 7"));
    expect(report.suggestions).toContainEqual(expect.stringContaining("Memo app"));
  });

  it("passes an unknown normalized code through verbatim", () => {
    // A structural SolanaError from a newer package copy keeps its code.
    const error = createSolanaError("RPC_FAILURE", "wrapped");
    Object.defineProperty(error, "code", { value: "FUTURE_CODE", writable: false });

    const report = buildDiagnosticReport({ error });

    expect(report.code).toBe("FUTURE_CODE");
    expect(report.outcome).toBe("failed");
    expect(report.suggestions).toEqual([]);
  });

  it("keeps an unknown raw error shape without guessing a code", () => {
    const report = buildDiagnosticReport({
      error: { SomeNewProgramError: { detail: 1 } },
    });

    expect(report.code).toBe("SomeNewProgramError");
    expect(report.summary).toContain("SomeNewProgramError");
  });

  it("uses app-supplied program labels without shipping a registry", () => {
    const report = buildDiagnosticReport({
      simulationResult: simulation({
        logs: [`Program ${PROGRAM} invoke [1]`],
      }),
      labels: { [PROGRAM]: "Memo app" },
    });

    expect(report.programs).toEqual([{ address: PROGRAM, label: "Memo app" }]);
    expect(report.suggestions).toContainEqual(expect.stringContaining("app-supplied labels"));
    expect(report.sources).toContain("labels");
  });

  it("leaves unlabeled program addresses untouched", () => {
    const report = buildDiagnosticReport({
      simulationResult: simulation({ logs: [`Program ${PROGRAM} invoke [1]`] }),
    });

    expect(report.programs).toEqual([{ address: PROGRAM }]);
    expect(report.suggestions).toEqual([
      "The simulation logs are available for program-specific diagnosis.",
    ]);
  });

  it("maps instruction errors from a failed simulation alone", () => {
    const report = buildDiagnosticReport({
      simulationResult: simulation({ err: { InstructionError: [1, "Custom"] } as never }),
    });

    expect(report.outcome).toBe("failed");
    expect(report.code).toBe("InstructionError");
    expect(report.suggestions).toContain(
      "Inspect the simulation logs to find the failing instruction.",
    );
  });

  it("rejects malformed input with INVALID_INPUT", () => {
    expect(() => buildDiagnosticReport(null as never)).toThrowError(
      expect.objectContaining({ code: "INVALID_INPUT" }),
    );
    expect(() => buildDiagnosticReport([] as never)).toThrowError(
      expect.objectContaining({ code: "INVALID_INPUT" }),
    );
    expect(() => buildDiagnosticReport({ signature: 42 as never })).toThrowError(
      expect.objectContaining({ code: "INVALID_INPUT" }),
    );
    expect(() => buildDiagnosticReport({ historyItem: "signature" as never })).toThrowError(
      expect.objectContaining({ code: "INVALID_INPUT" }),
    );
    expect(() => buildDiagnosticReport({ labels: { [PROGRAM]: 12 as never } })).toThrowError(
      expect.objectContaining({ code: "INVALID_INPUT" }),
    );
  });

  it("exposes createTransactionDiagnostics as the same builder", () => {
    expect(createTransactionDiagnostics).toBe(buildDiagnosticReport);
  });
});
