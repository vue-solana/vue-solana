import { PublicKey } from "@solana/web3-compat";
import { flushPromises } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { createMockSolanaContext, mountWithSolana } from "../../test-utils";
import { useBalance } from "./useBalance";

describe("useBalance", () => {
  it("loads a balance for a provided public key string", async () => {
    const getBalance = vi.fn().mockResolvedValue(123);
    const context = createMockSolanaContext({
      connection: { getBalance } as ReturnType<typeof createMockSolanaContext>["connection"],
    });
    const address = ref("11111111111111111111111111111111");
    let result: ReturnType<typeof useBalance> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useBalance(address, "confirmed");

          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();

    expect(result?.balance.value).toBe(123);
    expect(result?.loading.value).toBe(false);
    expect(result?.error.value).toBeNull();
    expect(getBalance).toHaveBeenCalledWith(expect.any(PublicKey), "confirmed");
  });

  it("clears the balance when no address is provided", async () => {
    const getBalance = vi.fn();
    const context = createMockSolanaContext({
      connection: { getBalance } as ReturnType<typeof createMockSolanaContext>["connection"],
    });
    let result: ReturnType<typeof useBalance> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useBalance(null);

          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();

    expect(result?.balance.value).toBeNull();
    expect(getBalance).not.toHaveBeenCalled();
  });

  it("stores and rethrows balance loading errors", async () => {
    const failure = new Error("RPC failed");
    const context = createMockSolanaContext({
      connection: {
        getBalance: vi.fn().mockRejectedValue(failure),
      } as ReturnType<typeof createMockSolanaContext>["connection"],
    });
    let result: ReturnType<typeof useBalance> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useBalance(new PublicKey("11111111111111111111111111111111"));

          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();

    await expect(result?.refresh()).rejects.toThrow("RPC failed");
    expect(result?.error.value).toBe(failure);
    expect(result?.loading.value).toBe(false);
  });
});
