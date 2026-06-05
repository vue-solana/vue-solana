import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { createMockSolanaContext, mountWithSolana } from "../../test-utils";
import { useConnection } from "./useConnection";
import { useRpc } from "./useRpc";

describe("useRpc", () => {
  it("exposes RPC state and connection", () => {
    const connection = { getLatestBlockhash: vi.fn() };
    const checkConnection = vi.fn().mockResolvedValue(undefined);
    const context = createMockSolanaContext({
      cluster: "localnet",
      endpoint: "http://127.0.0.1:8899",
      wsEndpoint: "ws://127.0.0.1:8900",
      connection: connection as ReturnType<typeof createMockSolanaContext>["connection"],
      status: ref("connected"),
      latestBlockhash: ref("blockhash"),
      checkConnection,
    });
    let rpc: ReturnType<typeof useRpc> | undefined;
    let directConnection: ReturnType<typeof useConnection> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          rpc = useRpc();
          directConnection = useConnection();

          return () => h("div");
        },
      }),
      context,
    );

    expect(rpc?.cluster.value).toBe("localnet");
    expect(rpc?.endpoint.value).toBe("http://127.0.0.1:8899");
    expect(rpc?.wsEndpoint.value).toBe("ws://127.0.0.1:8900");
    expect(rpc?.status.value).toBe("connected");
    expect(rpc?.latestBlockhash.value).toBe("blockhash");
    expect(rpc?.connection).toBe(connection);
    expect(directConnection).toBe(connection);
  });
});
