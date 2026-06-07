import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { createMockSolanaContext, mountWithSolana } from "../../test-utils";
import { useSolana } from "./useSolana";

describe("useSolana", () => {
  it("returns the injected Solana context", () => {
    const context = createMockSolanaContext({ endpoint: "https://rpc.example.com" });
    let result: ReturnType<typeof useSolana> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useSolana();

          return () => h("div");
        },
      }),
      context,
    );

    expect(result).toBe(context);
  });

  it("returns SSR-safe state when the plugin has not provided context", () => {
    const Component = defineComponent({
      setup() {
        result = useSolana();

        return () => h("div");
      },
    });
    let result: ReturnType<typeof useSolana> | undefined;

    mount(Component);

    expect(result?.cluster).toBe("devnet");
    expect(result?.wallet.value).toBeNull();
    expect(result?.status.value).toBe("idle");
  });
});
