import { flushPromises } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import {
  deferred,
  mountUseAccountInfo,
  systemProgram,
  wrappedSol,
} from "../../test-utils/useAccountInfo";

const ACCOUNT = {
  executable: false,
  lamports: 123,
  owner: systemProgram,
  space: 10,
  data: ["AQ==", "base64"],
};

describe("useAccountInfo", () => {
  it("loads and normalizes account info for an address string", async () => {
    const getAccountInfo = vi.fn(() => ({ send: vi.fn().mockResolvedValue({ value: ACCOUNT }) }));
    const { result } = mountUseAccountInfo(
      systemProgram,
      { commitment: "confirmed" },
      {
        rpc: { getAccountInfo },
      },
    );

    await flushPromises();

    expect(result.accountInfo.value).toEqual({
      executable: false,
      lamports: 123,
      owner: systemProgram,
      space: 10,
      data: new Uint8Array([1]),
    });
    expect(result.loading.value).toBe(false);
    expect(result.error.value).toBeNull();
    expect(getAccountInfo).toHaveBeenCalledWith(systemProgram, {
      encoding: "base64",
      commitment: "confirmed",
    });
  });

  it("leaves account info null when the account does not exist", async () => {
    const getAccountInfo = vi.fn(() => ({ send: vi.fn().mockResolvedValue({ value: null }) }));
    const { result } = mountUseAccountInfo(systemProgram, undefined, {
      rpc: { getAccountInfo },
    });

    await flushPromises();

    expect(result.accountInfo.value).toBeNull();
  });

  it("does not call RPC for null input", async () => {
    const getAccountInfo = vi.fn();
    const { result } = mountUseAccountInfo(null, undefined, { rpc: { getAccountInfo } });

    await flushPromises();

    expect(result.accountInfo.value).toBeNull();
    expect(getAccountInfo).not.toHaveBeenCalled();
  });

  it("stores invalid address errors without spamming RPC", async () => {
    const getAccountInfo = vi.fn();
    const { result } = mountUseAccountInfo("not-a-public-key", undefined, {
      rpc: { getAccountInfo },
    });

    await flushPromises();

    await expect(result.refresh()).rejects.toThrow();
    expect(result.error.value).toBeInstanceOf(Error);
    expect(result.error.value).toMatchObject({ code: "INVALID_ADDRESS" });
    expect(getAccountInfo).not.toHaveBeenCalled();
  });

  it("clears stale account info when a loaded address becomes invalid", async () => {
    const getAccountInfo = vi.fn(() => ({ send: vi.fn().mockResolvedValue({ value: ACCOUNT }) }));
    const address = ref(systemProgram);
    const { result } = mountUseAccountInfo(address, undefined, { rpc: { getAccountInfo } });

    await flushPromises();
    expect(result.accountInfo.value).toEqual(expect.objectContaining({ lamports: 123 }));

    address.value = "not-a-public-key";
    await flushPromises();

    expect(result.accountInfo.value).toBeNull();
    expect(result.error.value).toBeInstanceOf(Error);
    expect(result.error.value).toMatchObject({ code: "INVALID_ADDRESS" });
    expect(getAccountInfo).toHaveBeenCalledTimes(1);
  });

  it("keeps the newest account info when overlapping requests resolve out of order", async () => {
    const firstRequest = deferred<{ value: unknown }>();
    const secondRequest = deferred<{ value: unknown }>();
    const getAccountInfo = vi
      .fn()
      .mockReturnValueOnce({ send: () => firstRequest.promise })
      .mockReturnValueOnce({ send: () => secondRequest.promise });
    const address = ref(systemProgram);
    const { result } = mountUseAccountInfo(address, undefined, { rpc: { getAccountInfo } });

    await flushPromises();
    address.value = wrappedSol;
    await flushPromises();

    const newest = { ...ACCOUNT, lamports: 456 };
    secondRequest.resolve({ value: newest });
    await flushPromises();

    expect(result.accountInfo.value).toEqual(expect.objectContaining({ lamports: 456 }));

    firstRequest.resolve({ value: { ...ACCOUNT, lamports: 123 } });
    await flushPromises();

    expect(result.accountInfo.value).toEqual(expect.objectContaining({ lamports: 456 }));
    expect(getAccountInfo).toHaveBeenCalledTimes(2);
  });
});
