import { describe, expect, it } from "vitest";
import { createSolanaContext } from "./rpc";

describe("createSolanaContext", () => {
  it("creates a devnet context by default", () => {
    const context = createSolanaContext();

    expect(context.cluster).toBe("devnet");
    expect(context.endpoint).toBe("https://api.devnet.solana.com");
    expect(context.wsEndpoint).toBe("wss://api.devnet.solana.com");
    expect(context.connection).toBeDefined();
  });

  it("uses cluster endpoints when only a cluster is provided", () => {
    const context = createSolanaContext({ cluster: "testnet" });

    expect(context.cluster).toBe("testnet");
    expect(context.endpoint).toBe("https://api.testnet.solana.com");
    expect(context.wsEndpoint).toBe("wss://api.testnet.solana.com");
  });

  it("derives WebSocket endpoints for custom RPC endpoints", () => {
    const context = createSolanaContext({ endpoint: "https://rpc.example.com" });

    expect(context.cluster).toBe("devnet");
    expect(context.endpoint).toBe("https://rpc.example.com");
    expect(context.wsEndpoint).toBe("wss://rpc.example.com/");
  });

  it("uses an explicit WebSocket endpoint when provided", () => {
    const context = createSolanaContext({
      endpoint: "https://rpc.example.com",
      wsEndpoint: "wss://ws.example.com",
    });

    expect(context.wsEndpoint).toBe("wss://ws.example.com");
  });
});
