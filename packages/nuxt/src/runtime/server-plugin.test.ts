import { useRuntimeConfig } from "#app";
import {
  useRpc,
  useSelectedWalletAccount,
  useSolana,
  type VueSolanaContext,
} from "@vue-solana/vue";
import { clearSwrCache } from "@vue-solana/vue/swr";
import { createSSRApp, defineComponent, h, type App } from "vue";
import { renderToString } from "vue/server-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runtimeConfig } from "../../../../test/stubs/nuxt-app";
import plugin, { createServerSolanaContext } from "./server-plugin";

vi.mock("@vue-solana/vue/swr", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vue-solana/vue/swr")>();

  return { ...actual, clearSwrCache: vi.fn(actual.clearSwrCache) };
});

const runPlugin = (app: App) => {
  (plugin as unknown as (nuxtApp: { vueApp: App }) => void)({ vueApp: app });
};

function probe(onSetup: (context: VueSolanaContext) => void) {
  return defineComponent({
    setup() {
      onSetup(useSolana());

      return () => h("div", "probe");
    },
  });
}

describe("Nuxt server plugin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeConfig.public.solana = {};
  });

  it("provides the configured cluster and endpoints during SSR", async () => {
    runtimeConfig.public.solana = {
      cluster: "mainnet",
      endpoint: "https://rpc.example.com",
      wsEndpoint: "wss://rpc.example.com",
    };
    let context: VueSolanaContext | undefined;
    const app = createSSRApp(probe((next) => (context = next)));

    runPlugin(app);
    await renderToString(app);

    expect(useRuntimeConfig).toHaveBeenCalledOnce();
    expect(context?.cluster).toBe("mainnet");
    expect(context?.endpoint).toBe("https://rpc.example.com");
    expect(context?.wsEndpoint).toBe("wss://rpc.example.com");
    expect(context?.client).toBeDefined();
  });

  it("renders the configured cluster instead of a hardcoded devnet", async () => {
    runtimeConfig.public.solana = { cluster: "testnet" };
    const Component = defineComponent({
      setup() {
        const { cluster } = useRpc();

        return () => h("div", `cluster:${cluster.value}`);
      },
    });
    const app = createSSRApp(Component);

    runPlugin(app);

    expect(await renderToString(app)).toContain("cluster:testnet");
  });

  it("keeps wallet state inert and does not run an RPC check during SSR", async () => {
    let context: VueSolanaContext | undefined;
    const app = createSSRApp(probe((next) => (context = next)));

    runPlugin(app);
    await renderToString(app);
    await context?.checkConnection();

    expect(context?.wallet.value).toBeNull();
    expect(context?.wallets.value).toEqual([]);
    expect(context?.selectedWallet.value).toBeNull();
    expect(context?.status.value).toBe("idle");
    expect(context?.error.value).toBeNull();
    expect(context?.latestBlockhash.value).toBeNull();
  });

  it("installs the selected wallet account context so SSR pages can read it", async () => {
    const Component = defineComponent({
      setup() {
        const [account] = useSelectedWalletAccount();

        return () => h("div", `account:${String(account.value)}`);
      },
    });
    const app = createSSRApp(Component);

    runPlugin(app);

    expect(await renderToString(app)).toContain("account:null");
  });

  it("clears the shared SWR cache once per request", () => {
    runPlugin(createSSRApp(probe(() => undefined)));
    runPlugin(createSSRApp(probe(() => undefined)));

    expect(clearSwrCache).toHaveBeenCalledTimes(2);
  });

  it("builds fresh refs per request so concurrent renders cannot share state", () => {
    const first = createServerSolanaContext({ cluster: "devnet" });
    const second = createServerSolanaContext({ cluster: "devnet" });

    expect(first).not.toBe(second);
    expect(first.wallet).not.toBe(second.wallet);
    expect(first.status).not.toBe(second.status);
    expect(first.wallets).not.toBe(second.wallets);
  });

  it("does not forward signer secrets or build-time flags into the context", () => {
    const rawConfig = {
      cluster: "devnet",
      payer: { address: "signer" },
      payerSecretKey: "not-a-keypair",
      wallet: { connect: () => {} },
      clientPlugin: false,
    } as never;

    expect(() => createServerSolanaContext(rawConfig)).not.toThrow();
    expect(createServerSolanaContext(rawConfig).cluster).toBe("devnet");
  });

  it("falls back to defaults for missing or non-object config", () => {
    expect(createServerSolanaContext(undefined).cluster).toBe("devnet");
    expect(createServerSolanaContext("not-an-object").cluster).toBe("devnet");
  });
});
