// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

const runtimeConfig = {
  solanaServer: undefined as unknown,
};

vi.mock("#imports", () => ({
  useRuntimeConfig: () => runtimeConfig,
}));

describe("@vue-solana/nuxt/server", () => {
  afterEach(() => {
    runtimeConfig.solanaServer = undefined;
    vi.resetModules();
  });

  it("creates a server Solana client with the configured cluster and endpoints", async () => {
    const { createServerSolanaClient } = await import("./server");

    const client = createServerSolanaClient({
      cluster: "mainnet",
      endpoint: "https://rpc.example.com",
      wsEndpoint: "wss://rpc.example.com",
      commitment: "confirmed",
    });

    expect(client.rpc).toBeDefined();
    expect(client.rpcSubscriptions).toBeDefined();
    expect("payer" in client).toBe(false);
  });

  it("strips wallet, payer, and payerSecretKey from runtime input", async () => {
    const { createServerSolanaClient } = await import("./server");

    const client = createServerSolanaClient({
      cluster: "devnet",
      // These fields are forbidden by type and must be ignored at runtime.
      wallet: { connect: () => {} },
      payer: { address: "signer" },
      payerSecretKey: "not-a-valid-keypair",
    } as never);

    expect(client.rpc).toBeDefined();
    expect("payer" in client).toBe(false);
  });

  it("reads the private runtimeConfig.solanaServer key", async () => {
    runtimeConfig.solanaServer = {
      cluster: "testnet",
      endpoint: "https://testnet.example.com",
    };

    const { useServerSolanaClient } = await import("./server");
    const client = useServerSolanaClient();

    expect(client.rpc).toBeDefined();
    expect("payer" in client).toBe(false);
  });

  it("does not read public solana config", async () => {
    runtimeConfig.solanaServer = undefined;

    const { useServerSolanaClient } = await import("./server");

    // Should fall back to core defaults, not throw because public config is absent.
    expect(() => useServerSolanaClient()).not.toThrow();
  });
});
