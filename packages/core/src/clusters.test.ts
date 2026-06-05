import { describe, expect, it } from "vitest";
import {
  DEFAULT_CLUSTER,
  getClusterEndpoint,
  getClusterWebSocketEndpoint,
  getWebSocketEndpoint,
} from "./clusters";

describe("clusters", () => {
  it("uses devnet as the default cluster", () => {
    expect(DEFAULT_CLUSTER).toBe("devnet");
    expect(getClusterEndpoint()).toBe("https://api.devnet.solana.com");
    expect(getClusterWebSocketEndpoint()).toBe("wss://api.devnet.solana.com");
  });

  it("returns known HTTP and WebSocket endpoints", () => {
    expect(getClusterEndpoint("mainnet-beta")).toBe("https://api.mainnet-beta.solana.com");
    expect(getClusterEndpoint("testnet")).toBe("https://api.testnet.solana.com");
    expect(getClusterEndpoint("localnet")).toBe("http://127.0.0.1:8899");

    expect(getClusterWebSocketEndpoint("mainnet-beta")).toBe("wss://api.mainnet-beta.solana.com");
    expect(getClusterWebSocketEndpoint("testnet")).toBe("wss://api.testnet.solana.com");
    expect(getClusterWebSocketEndpoint("localnet")).toBe("ws://127.0.0.1:8900");
  });

  it("derives a WebSocket endpoint from a custom RPC endpoint", () => {
    expect(getWebSocketEndpoint("https://rpc.example.com/path")).toBe("wss://rpc.example.com/path");
    expect(getWebSocketEndpoint("http://127.0.0.1:8899")).toBe("ws://127.0.0.1:8899/");
  });
});
