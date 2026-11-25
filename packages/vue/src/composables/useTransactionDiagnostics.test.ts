import { address, type Signature } from "@vue-solana/core/kit";
import type {
  FeeBudget,
  SimulatedTransactionResult,
  TransactionHistoryItem,
} from "@vue-solana/core/types";
import { effectScope, nextTick, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useTransactionDiagnostics } from "./useTransactionDiagnostics";

const SIGNATURE =
  "2Ana1pUpv2ZbMVkwF5FXapYeBEjdxDatLn7nvJkhgTSXbs59SyZSx866bXirPgj8QQVB57uxHJBG1YFvkRbFj4T" as Signature;
const PROGRAM = address("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

function history(overrides: Partial<TransactionHistoryItem> = {}): TransactionHistoryItem {
  return { signature: SIGNATURE, slot: 123_456n, err: null, ...overrides };
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

function budget(): FeeBudget {
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
  };
}

function setupInScope<T>(setup: () => T): T {
  const scope = effectScope();
  const result = scope.run(setup);

  if (!result) {
    throw new Error("setup did not return a result");
  }

  return result;
}

describe("useTransactionDiagnostics", () => {
  it("stays idle until refresh is called explicitly", () => {
    const diagnostics = setupInScope(() => useTransactionDiagnostics(SIGNATURE));

    expect(diagnostics.status.value).toBe("idle");
    expect(diagnostics.report.value).toBeNull();
    expect(diagnostics.loading.value).toBe(false);
  });

  it("builds a report from a signature source", async () => {
    const diagnostics = setupInScope(() => useTransactionDiagnostics(SIGNATURE));

    const report = await diagnostics.refresh();

    expect(report?.signature).toBe(SIGNATURE);
    expect(report?.outcome).toBe("unknown");
    expect(diagnostics.status.value).toBe("built");
    expect(diagnostics.report.value).toBe(report);
    expect(diagnostics.loading.value).toBe(false);
  });

  it("joins reactive history, simulation, error, fee budget, and labels sources", async () => {
    const source = ref<TransactionHistoryItem | null>(null);
    const simulationSource = ref<SimulatedTransactionResult | null>(
      simulation({ unitsConsumed: 90n, logs: [`Program ${PROGRAM} invoke [1]`] }),
    );
    const errorSource = ref<unknown>({ InstructionError: [0, { Custom: 3 }] });
    const labels = ref({ [PROGRAM]: "Memo app" });

    const diagnostics = setupInScope(() =>
      useTransactionDiagnostics(source, {
        simulationResult: simulationSource,
        error: errorSource,
        feeBudget: budget(),
        labels,
      }),
    );

    const report = await diagnostics.refresh();

    expect(report?.outcome).toBe("failed");
    expect(report?.code).toBe("InstructionError");
    expect(report?.unitsConsumed).toBe(90);
    expect(report?.feeBudget?.capped).toBe(false);
    expect(report?.programs).toEqual([{ address: PROGRAM, label: "Memo app" }]);
    expect(report?.suggestions).toContainEqual(expect.stringContaining("custom code 3"));
    expect(report?.sources).toEqual(["simulation", "error", "feeBudget", "labels"]);
  });

  it("rebuilds when a reactive source changes and supersedes the previous build", async () => {
    const source = ref<TransactionHistoryItem | null>(history());
    const diagnostics = setupInScope(() => useTransactionDiagnostics(source));

    await diagnostics.refresh();
    expect(diagnostics.report.value?.outcome).toBe("succeeded");

    source.value = history({ err: { BlockhashNotFound: {} } as never });
    await nextTick();
    await vi.waitFor(() => {
      expect(diagnostics.report.value?.outcome).toBe("failed");
    });
    expect(diagnostics.report.value?.code).toBe("BlockhashNotFound");
  });

  it("resets to idle when every source is empty", async () => {
    const source = ref<Signature | null>(SIGNATURE);
    const diagnostics = setupInScope(() => useTransactionDiagnostics(source));

    await diagnostics.refresh();
    expect(diagnostics.status.value).toBe("built");

    source.value = null;
    await nextTick();
    await vi.waitFor(() => {
      expect(diagnostics.status.value).toBe("idle");
    });

    expect(diagnostics.report.value).toBeNull();
    expect(await diagnostics.refresh()).toBeNull();
    expect(diagnostics.status.value).toBe("idle");
  });

  it("surfaces INVALID_INPUT for malformed label maps", async () => {
    const diagnostics = setupInScope(() =>
      useTransactionDiagnostics(SIGNATURE, {
        labels: { [PROGRAM]: 42 as never },
      }),
    );

    await expect(diagnostics.refresh()).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(diagnostics.error.value?.code).toBe("INVALID_INPUT");
    expect(diagnostics.status.value).toBe("error");
  });

  it("does not write state after scope disposal", async () => {
    const scope = effectScope();
    const diagnostics = scope.run(() => useTransactionDiagnostics(SIGNATURE));

    if (!diagnostics) {
      throw new Error("setup did not return diagnostics");
    }

    const pending = diagnostics.refresh();
    scope.stop();
    await pending;

    expect(diagnostics.status.value).toBe("idle");
    expect(diagnostics.report.value).toBeNull();
  });
});
