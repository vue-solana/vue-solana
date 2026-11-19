// @vitest-environment node
import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it, vi } from "vitest";
import { createMockSolanaContext } from "../../test-utils";
import { signature } from "../../test-utils/useSignatureStatus";
import { solanaInjectionKey } from "../injection";
import { useAddressRead } from "./use-address-read";
import { useRequest } from "./useRequest";
import { useSignatureStatus } from "./useSignatureStatus";
import { useSubscription } from "./useSubscription";
import { useTrackedData } from "./useTrackedData";

/**
 * The data composables must stay inert while a Nuxt page is rendered on the
 * server. Each one wires its work to `onMounted`/a watcher; the
 * `!getCurrentInstance()` fallback would otherwise make a component-less call
 * fetch immediately. This renders real components through Vue's SSR renderer
 * so the fallback is exercised with a component instance present.
 */
describe("data composables during SSR", () => {
  it("does not send requests, open streams, or start polling during render", async () => {
    const send = vi.fn(() => Promise.resolve({ context: { slot: 0n }, value: 1 }));
    const reactiveStore = vi.fn(() => {
      throw new Error("stream opened during SSR");
    });
    const read = vi.fn(() => {
      throw new Error("RPC read during SSR");
    });
    const context = createMockSolanaContext();

    const Component = defineComponent({
      setup() {
        useRequest(send);
        useSubscription({ reactiveStore });
        useTrackedData({
          rpcRequest: { send },
          rpcSubscriptionRequest: { reactiveStore },
          rpcValueMapper: (value: number) => value,
          rpcSubscriptionValueMapper: (value: number) => value,
        });
        useAddressRead(["address"], read, (value: number) => value, 0);
        useSignatureStatus(signature, { pollIntervalMs: 10 });

        return () => h("div", "rendered");
      },
    });
    const app = createSSRApp(Component);
    app.provide(solanaInjectionKey, context);

    expect(await renderToString(app)).toContain("rendered");
    // Outlive the polling interval so a timer started at setup would be caught.
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(send).not.toHaveBeenCalled();
    expect(reactiveStore).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
  });
});
