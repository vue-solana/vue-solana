import { PublicKey } from "@solana/web3-compat";
import { flushPromises } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import {
  deferred,
  mountUseAccountInfo,
  systemProgram,
  wrappedSol,
} from "../../test-utils/useAccountInfo";

describe("useAccountInfo", () => {
  it("loads account info for a public key string", async () => {
    const account = { lamports: 123 };
    const getAccountInfo = vi.fn().mockResolvedValue(account);
    const { result } = mountUseAccountInfo(
      systemProgram,
      { commitment: "confirmed" },
      { getAccountInfo },
    );

    await flushPromises();

    expect(result.accountInfo.value).toBe(account);
    expect(result.loading.value).toBe(false);
    expect(result.error.value).toBeNull();
    expect(getAccountInfo).toHaveBeenCalledWith(expect.any(PublicKey), "confirmed");
  });

  it("does not call RPC for null input", async () => {
    const getAccountInfo = vi.fn();
    const { result } = mountUseAccountInfo(null, undefined, { getAccountInfo });

    await flushPromises();

    expect(result.accountInfo.value).toBeNull();
    expect(getAccountInfo).not.toHaveBeenCalled();
  });

  it("stores invalid public key errors without spamming RPC", async () => {
    const getAccountInfo = vi.fn();
    const { result } = mountUseAccountInfo("not-a-public-key", undefined, { getAccountInfo });

    await flushPromises();

    await expect(result.refresh()).rejects.toThrow();
    expect(result.error.value).toBeInstanceOf(Error);
    expect(getAccountInfo).not.toHaveBeenCalled();
  });

  it("clears stale account info when a loaded address becomes invalid", async () => {
    const account = { lamports: 123 };
    const getAccountInfo = vi.fn().mockResolvedValue(account);
    const address = ref(systemProgram);
    const { result } = mountUseAccountInfo(address, undefined, { getAccountInfo });

    await flushPromises();
    expect(result.accountInfo.value).toBe(account);

    address.value = "not-a-public-key";
    await flushPromises();

    expect(result.accountInfo.value).toBeNull();
    expect(result.error.value).toBeInstanceOf(Error);
    expect(getAccountInfo).toHaveBeenCalledTimes(1);
  });

  it("keeps the newest account info when overlapping requests resolve out of order", async () => {
    const firstRequest = deferred<unknown>();
    const secondRequest = deferred<unknown>();
    const getAccountInfo = vi
      .fn()
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise);
    const address = ref(systemProgram);
    const { result } = mountUseAccountInfo(address, undefined, { getAccountInfo });

    await flushPromises();
    address.value = wrappedSol;
    await flushPromises();

    const newest = { lamports: 456 };
    secondRequest.resolve(newest);
    await flushPromises();

    expect(result.accountInfo.value).toBe(newest);

    firstRequest.resolve({ lamports: 123 });
    await flushPromises();

    expect(result.accountInfo.value).toBe(newest);
    expect(getAccountInfo).toHaveBeenCalledTimes(2);
  });
});
