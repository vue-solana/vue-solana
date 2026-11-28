// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  computed,
  effectScope,
  ref,
  shallowRef,
  toValue,
  type MaybeRefOrGetter,
  type Ref,
} from "vue";
import { address, type Address } from "@vue-solana/core/kit";
import type { TokenPortfolioResult } from "@vue-solana/core/token-portfolio";
import { useTokenPortfolio, type UseTokenPortfolioReturn } from "./useTokenPortfolio";
import { tryUseSolana } from "./useSolana";
import { useSolanaClient } from "./useSolanaClient";
import { useSubscription } from "./useSubscription";

vi.mock("@vue-solana/core/token-portfolio", () => ({ getTokenPortfolio: vi.fn() }));
vi.mock("@vue-solana/core/token-portfolio-2022", () => ({ getTokenPortfolio2022: vi.fn() }));
vi.mock("./useSolana", () => ({ tryUseSolana: vi.fn() }));
vi.mock("./useSolanaClient", () => ({ useSolanaClient: vi.fn() }));
vi.mock("./useSubscription", () => ({ useSubscription: vi.fn() }));

import { getTokenPortfolio } from "@vue-solana/core/token-portfolio";
import { getTokenPortfolio2022 } from "@vue-solana/core/token-portfolio-2022";

const OWNER = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin";
const OTHER_OWNER = "So11111111111111111111111111111111111111112";

const mockGetTokenPortfolio = vi.mocked(getTokenPortfolio);
const mockGetTokenPortfolio2022 = vi.mocked(getTokenPortfolio2022);
const mockTryUseSolana = vi.mocked(tryUseSolana);
const mockUseSolanaClient = vi.mocked(useSolanaClient);
const mockUseSubscription = vi.mocked(useSubscription);

function portfolioResult(owner: string): TokenPortfolioResult {
  return {
    owner: address(owner),
    programId: address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    accounts: [
      {
        address: address("11111111111111111111111111111111"),
        mint: address("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
        owner: address(owner),
        amount: 1_000_000n,
        decimals: 6,
        uiAmount: 1,
        decimalsSource: "mint" as const,
        state: "initialized" as const,
        isNative: false,
      },
    ],
    byMint: {},
    totals: { accounts: 1, mints: 1 },
    unresolvedMints: [],
  };
}

function setupPortfolio(
  owner: MaybeRefOrGetter<Address | string | null | undefined> | Ref<string | null>,
  options: Parameters<typeof useTokenPortfolio>[1] = {},
  withSlots = false,
  slotError: unknown = null,
) {
  const slotData = shallowRef<unknown>(undefined);
  const client = {
    rpc: {},
    ...(withSlots ? { rpcSubscriptions: { slotNotifications: () => ({}) } } : {}),
  };
  mockUseSolanaClient.mockReturnValue({ client: client as never, rpc: {} as never });
  mockUseSubscription.mockImplementation((source) => {
    const enabled = computed(() => toValue(source as never) !== null);

    return {
      data: computed(() => (enabled.value ? slotData.value : undefined)),
      error: computed(() => (enabled.value ? (slotError as never) : null)),
      reconnect: () => undefined,
      status: computed(() => (enabled.value ? (slotError ? "error" : "loading") : "disabled")),
    };
  });

  let result: UseTokenPortfolioReturn | undefined;
  const scope = effectScope();

  scope.run(() => {
    result = useTokenPortfolio(owner, options);
  });

  return { result: result!, scope, slotData };
}

describe("useTokenPortfolio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTryUseSolana.mockReturnValue(null);
    mockGetTokenPortfolio.mockImplementation(async (_client, owner) =>
      portfolioResult(String(toValue(owner))),
    );
    mockGetTokenPortfolio2022.mockImplementation(async (_client, owner) =>
      portfolioResult(String(toValue(owner))),
    );
  });

  it("exposes reactive items, totals, and loading state", async () => {
    const { result } = setupPortfolio(OWNER, { commitment: "confirmed" });

    expect(result.loading.value).toBe(true);
    expect(result.items.value).toEqual([]);
    await vi.waitFor(() => expect(result.loading.value).toBe(false));

    expect(result.items.value).toHaveLength(1);
    expect(result.totals.value).toEqual({ accounts: 1, mints: 1 });
    expect(result.error.value).toBeNull();
    expect(mockGetTokenPortfolio).toHaveBeenCalledWith(expect.anything(), OWNER, {
      commitment: "confirmed",
      abortSignal: expect.any(AbortSignal),
    });
  });

  it("does not read or subscribe when the owner is null", async () => {
    const { result } = setupPortfolio(null, {}, true);

    await vi.waitFor(() => expect(result.status.value).toBe("disabled"));

    expect(result.items.value).toEqual([]);
    expect(result.totals.value).toEqual({ accounts: 0, mints: 0 });
    expect(result.slotStatus.value).toBe("disabled");
    expect(mockGetTokenPortfolio).not.toHaveBeenCalled();
    expect(mockUseSubscription.mock.calls[0]?.[0]).toMatchObject({ value: null });
  });

  it("keeps empty state per instance", () => {
    const first = setupPortfolio(null).result;
    const second = setupPortfolio(null).result;

    first.items.value.push({} as never);

    expect(second.items.value).toEqual([]);
    expect(second.byMint.value).toEqual({});
    expect(second.totals.value).toEqual({ accounts: 0, mints: 0 });
  });

  it("re-reads when the owner changes and keeps the newest result", async () => {
    const owner = ref<string | null>(OWNER);
    const { result } = setupPortfolio(owner);
    await vi.waitFor(() => expect(mockGetTokenPortfolio).toHaveBeenCalledTimes(1));

    owner.value = OTHER_OWNER;
    await vi.waitFor(() => expect(mockGetTokenPortfolio).toHaveBeenCalledTimes(2));

    expect(mockGetTokenPortfolio).toHaveBeenLastCalledWith(
      expect.anything(),
      OTHER_OWNER,
      expect.anything(),
    );
    expect(result.items.value[0]?.owner).toBe(OTHER_OWNER);
  });

  it("does not show the previous owner's data while a new owner loads", async () => {
    const owner = ref<string | null>(OWNER);
    const { result } = setupPortfolio(owner);
    await vi.waitFor(() => expect(result.status.value).toBe("success"));
    expect(result.items.value[0]?.owner).toBe(OWNER);

    let resolveNext!: (value: TokenPortfolioResult) => void;
    mockGetTokenPortfolio.mockReturnValueOnce(
      new Promise<TokenPortfolioResult>((resolve) => {
        resolveNext = resolve;
      }),
    );
    owner.value = OTHER_OWNER;

    await vi.waitFor(() => expect(result.status.value).toBe("fetching"));
    expect(result.items.value).toEqual([]);
    expect(result.portfolio.value).toBeUndefined();

    resolveNext(portfolioResult(OTHER_OWNER));
    await vi.waitFor(() => expect(result.items.value[0]?.owner).toBe(OTHER_OWNER));
  });

  it("invalidates from slot notifications when the client supports them", async () => {
    const { result, slotData } = setupPortfolio(OWNER, {}, true);
    await vi.waitFor(() => expect(result.status.value).toBe("success"));

    expect(result.slotStatus.value).toBe("loading");
    expect(result.slotError.value).toBeNull();
    expect(mockUseSubscription.mock.calls[0]?.[0]).toBeDefined();

    slotData.value = { slot: 1n };
    await vi.waitFor(() => expect(mockGetTokenPortfolio).toHaveBeenCalledTimes(2));
  });

  it("coalesces slot notifications that arrive during an in-flight read", async () => {
    let resolveFirst!: (value: TokenPortfolioResult) => void;
    mockGetTokenPortfolio.mockReturnValueOnce(
      new Promise<TokenPortfolioResult>((resolve) => {
        resolveFirst = resolve;
      }),
    );

    const { slotData } = setupPortfolio(OWNER, {}, true);
    slotData.value = { slot: 1n };
    slotData.value = { slot: 2n };

    resolveFirst(portfolioResult(OWNER));

    await vi.waitFor(() => expect(mockGetTokenPortfolio).toHaveBeenCalledTimes(2));
  });

  it("does not subscribe when invalidateOnSlot is false", async () => {
    const { slotData } = setupPortfolio(OWNER, { invalidateOnSlot: false }, true);
    await vi.waitFor(() => expect(mockGetTokenPortfolio).toHaveBeenCalledTimes(1));

    expect(mockUseSubscription.mock.calls[0]?.[0]).toMatchObject({ value: null });
    slotData.value = { slot: 1n };
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockGetTokenPortfolio).toHaveBeenCalledTimes(1);
  });

  it("routes Token-2022 reads through the lazy opt-in helper", async () => {
    const { result } = setupPortfolio(OWNER, { includeToken2022: true });
    await vi.waitFor(() => expect(mockGetTokenPortfolio2022).toHaveBeenCalledTimes(1));

    expect(mockGetTokenPortfolio2022).toHaveBeenCalledWith(
      expect.anything(),
      OWNER,
      expect.anything(),
    );
    expect(mockGetTokenPortfolio).not.toHaveBeenCalled();
    expect(result.items.value).toHaveLength(1);
  });

  it("normalizes transport failures to RPC_FAILURE", async () => {
    mockGetTokenPortfolio.mockRejectedValueOnce(new Error("RPC down"));
    const { result } = setupPortfolio(OWNER);

    await vi.waitFor(() => expect(result.error.value?.code).toBe("RPC_FAILURE"));
    expect(result.loading.value).toBe(false);
    expect(result.items.value).toEqual([]);
  });

  it("clears data when a later refresh fails", async () => {
    const { result } = setupPortfolio(OWNER);
    await vi.waitFor(() => expect(result.status.value).toBe("success"));
    expect(result.items.value).toHaveLength(1);

    mockGetTokenPortfolio.mockRejectedValueOnce(new Error("RPC down"));
    await result.refresh().catch(() => undefined);

    await vi.waitFor(() => expect(result.error.value?.code).toBe("RPC_FAILURE"));
    expect(result.portfolio.value).toBeUndefined();
    expect(result.items.value).toEqual([]);
    expect(result.totals.value).toEqual({ accounts: 0, mints: 0 });
  });

  it("surfaces slot subscription errors", async () => {
    const slotFailure = { name: "SolanaError", code: "RPC_FAILURE", message: "ws down" };
    const { result } = setupPortfolio(OWNER, {}, true, slotFailure);

    await vi.waitFor(() => expect(result.slotStatus.value).toBe("error"));
    expect(result.slotError.value).toBe(slotFailure);
  });

  it("uses the injected context client without falling back to useSolanaClient", async () => {
    const contextClient = { rpc: {} };
    mockTryUseSolana.mockReturnValue({ client: contextClient } as never);

    const { result } = setupPortfolio(OWNER);
    await vi.waitFor(() => expect(result.status.value).toBe("success"));

    expect(mockGetTokenPortfolio).toHaveBeenCalledWith(contextClient, OWNER, expect.anything());
    expect(mockUseSolanaClient).not.toHaveBeenCalled();
  });

  it("aborts a superseded read when the owner changes", async () => {
    let firstSignal: AbortSignal | undefined;
    mockGetTokenPortfolio.mockImplementationOnce(
      (_client, _owner, readOptions) =>
        new Promise<TokenPortfolioResult>(() => {
          firstSignal = readOptions?.abortSignal;
        }),
    );

    const owner = ref<string | null>(OWNER);
    setupPortfolio(owner);
    await vi.waitFor(() => expect(firstSignal).toBeDefined());

    owner.value = OTHER_OWNER;

    await vi.waitFor(() => expect(firstSignal?.aborted).toBe(true));
  });

  it("aborts in-flight reads when the scope is disposed", async () => {
    let signal: AbortSignal | undefined;
    mockGetTokenPortfolio.mockImplementationOnce(
      (_client, _owner, readOptions) =>
        new Promise<TokenPortfolioResult>(() => {
          signal = readOptions?.abortSignal;
        }),
    );

    const { scope } = setupPortfolio(OWNER);
    await vi.waitFor(() => expect(signal).toBeDefined());

    scope.stop();

    expect(signal?.aborted).toBe(true);
  });

  it("re-reads when reactive options change", async () => {
    const includeToken2022 = ref(false);
    const { result } = setupPortfolio(OWNER, { includeToken2022 });

    await vi.waitFor(() => expect(mockGetTokenPortfolio).toHaveBeenCalledTimes(1));
    expect(mockGetTokenPortfolio2022).not.toHaveBeenCalled();

    includeToken2022.value = true;

    await vi.waitFor(() => expect(mockGetTokenPortfolio2022).toHaveBeenCalledTimes(1));
    expect(result.status.value).toBe("success");
  });
});
