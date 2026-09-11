import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { createMockSolanaContext, mountWithSolana } from "../../test-utils";
import { useSolanaClient } from "./useSolanaClient";

describe("useSolanaClient", () => {
  it("returns the context client and its rpc", () => {
    const context = createMockSolanaContext();
    let result: ReturnType<typeof useSolanaClient> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useSolanaClient();

          return () => h("div");
        },
      }),
      context,
    );

    expect(result?.client).toBe(context.client);
    expect(result?.rpc).toBe(context.client.rpc);
  });

  it("throws a clear error when the plugin is not installed", () => {
    expect(() => useSolanaClient()).toThrow("Vue Solana plugin is not installed");
  });
});
