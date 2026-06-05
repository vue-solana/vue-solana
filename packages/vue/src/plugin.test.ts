import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createSolanaPlugin } from "./plugin";
import { useSolana } from "./composables/useSolana";

const { createSolanaContext } = vi.hoisted(() => ({
  createSolanaContext: vi.fn(),
}));

vi.mock("@vue-solana/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vue-solana/core")>();

  return {
    ...actual,
    createSolanaContext,
  };
});

describe("createSolanaPlugin", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    createSolanaContext.mockReset();
  });

  it("provides Solana context and checks the RPC connection", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const connection = {
      getLatestBlockhash: vi.fn().mockResolvedValue({ blockhash: "latest-blockhash" }),
    };
    createSolanaContext.mockReturnValue({
      cluster: "devnet",
      endpoint: "https://api.devnet.solana.com",
      wsEndpoint: "wss://api.devnet.solana.com",
      connection,
    });
    let solana: ReturnType<typeof useSolana> | undefined;

    mount(
      defineComponent({
        setup() {
          solana = useSolana();

          return () => h("div");
        },
      }),
      {
        global: {
          plugins: [[createSolanaPlugin({ cluster: "devnet" })]],
        },
      },
    );

    await vi.waitFor(() => {
      expect(solana?.status.value).toBe("connected");
    });

    expect(createSolanaContext).toHaveBeenCalledWith({ cluster: "devnet" });
    expect(solana?.latestBlockhash.value).toBe("latest-blockhash");
    expect(solana?.connection).toBe(connection);
  });

  it("stores connection check errors", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    createSolanaContext.mockReturnValue({
      cluster: "devnet",
      endpoint: "https://api.devnet.solana.com",
      wsEndpoint: "wss://api.devnet.solana.com",
      connection: {
        getLatestBlockhash: vi.fn().mockRejectedValue(new Error("offline")),
      },
    });
    let solana: ReturnType<typeof useSolana> | undefined;

    mount(
      defineComponent({
        setup() {
          solana = useSolana();

          return () => h("div");
        },
      }),
      {
        global: {
          plugins: [[createSolanaPlugin()]],
        },
      },
    );

    await vi.waitFor(() => {
      expect(solana?.status.value).toBe("error");
    });

    expect(solana?.error.value).toBe("offline");
  });
});
