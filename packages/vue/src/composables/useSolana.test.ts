import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, type InjectionKey } from "vue";
import { solanaInjectionKey, type VueSolanaContext } from "../injection";
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

  it("uses a stable injection key across duplicated package instances", () => {
    const context = createMockSolanaContext({ endpoint: "https://rpc.example.com" });
    const duplicatePackageKey = Symbol.for("vue-solana:context") as InjectionKey<VueSolanaContext>;
    let result: ReturnType<typeof useSolana> | undefined;

    // A second copy of the package in the tree must resolve the same key. This
    // also pins the registry string, which `apps/docs` hardcodes in
    // `app/plugins/solana-client-capabilities.client.ts` because Nuxt's import
    // protection blocks it from importing the published root at runtime.
    expect(solanaInjectionKey).toBe(duplicatePackageKey);

    mount(
      defineComponent({
        setup() {
          result = useSolana();

          return () => h("div");
        },
      }),
      {
        global: {
          provide: {
            [duplicatePackageKey as symbol]: context,
          },
        },
      },
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
