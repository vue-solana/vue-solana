// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import bs58 from "bs58";
import nacl from "tweetnacl";

const { rpcAirdropMock, solanaRpcMock } = vi.hoisted(() => {
  const solanaRpcMock = vi.fn(() => (client: Record<string, unknown>) => ({
    ...client,
    rpc: {},
    rpcSubscriptions: {},
    getMinimumBalance: vi.fn(),
    planTransaction: vi.fn(),
    planTransactions: vi.fn(),
    signTransaction: vi.fn(),
    signTransactions: vi.fn(),
    sendTransaction: vi.fn(),
    sendTransactions: vi.fn(),
  }));
  const rpcAirdropMock = vi.fn(() => (client: Record<string, unknown>) => ({
    ...client,
    airdrop: vi.fn(),
  }));

  return { rpcAirdropMock, solanaRpcMock };
});

vi.mock("@solana/kit-plugin-rpc", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@solana/kit-plugin-rpc")>();

  return { ...actual, rpcAirdrop: rpcAirdropMock, solanaRpc: solanaRpcMock };
});

const { createSolanaClient } = await import("./kit");
const signer = {
  address: "11111111111111111111111111111111" as const,
  signTransactions: async () => [],
} as never;

describe("createSolanaClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("installs the official RPC transaction capabilities", () => {
    const client = createSolanaClient({ payer: signer });

    expect(solanaRpcMock).toHaveBeenCalledWith({
      rpcUrl: "https://api.devnet.solana.com",
      rpcSubscriptionsUrl: "wss://api.devnet.solana.com",
    });
    expect(rpcAirdropMock).toHaveBeenCalledOnce();
    expect(client.payer).toBe(signer);
    expect(typeof client.sendTransaction).toBe("function");
    expect(typeof client.sendTransactions).toBe("function");
    expect(typeof client.planTransaction).toBe("function");
  });

  it("keeps the payer optional when no signer is configured", () => {
    const client = createSolanaClient();

    expect(client.payer).toBeUndefined();
    // No phantom own key: feature detection with `'payer' in client` must not
    // report a payer that was never configured.
    expect("payer" in client).toBe(false);
    expect(typeof client.sendTransaction).toBe("function");
  });

  it("forwards explicit HTTP and WebSocket endpoints", () => {
    createSolanaClient({
      endpoint: "https://rpc.example.com/path",
      wsEndpoint: "wss://subscriptions.example.com",
    });

    expect(solanaRpcMock).toHaveBeenCalledWith({
      rpcUrl: "https://rpc.example.com/path",
      rpcSubscriptionsUrl: "wss://subscriptions.example.com",
    });
  });

  it("resolves and validates a base64 payerSecretKey", async () => {
    const { publicKey, secretKey } = nacl.sign.keyPair();
    const base64Secret = Buffer.from(secretKey).toString("base64");
    const client = createSolanaClient({ payerSecretKey: base64Secret });
    const payer = client.payer as unknown as {
      address: string;
      signTransactions: (
        transactions: readonly { messageBytes: Uint8Array }[],
      ) => Promise<readonly Record<string, Uint8Array>[]>;
    };
    const messageBytes = new Uint8Array([1, 2, 3, 4]);
    const signatures = await payer.signTransactions([{ messageBytes }]);
    const signature = signatures[0]?.[payer.address];

    expect(payer.address).toBe(bs58.encode(publicKey));
    expect(client.payer).toBe(payer);
    expect(signature).toBeDefined();
    expect(nacl.sign.detached.verify(messageBytes, signature!, publicKey)).toBe(true);
  });

  it("rejects an aborted signTransactions call", async () => {
    const { secretKey } = nacl.sign.keyPair();
    const client = createSolanaClient({
      payerSecretKey: Buffer.from(secretKey).toString("base64"),
    });
    const payer = client.payer as unknown as {
      signTransactions: (
        transactions: readonly unknown[],
        config?: { abortSignal?: AbortSignal },
      ) => Promise<unknown>;
    };
    const controller = new AbortController();

    controller.abort();

    await expect(
      payer.signTransactions([{ messageBytes: new Uint8Array([1]) }], {
        abortSignal: controller.signal,
      }),
    ).rejects.toThrow();
  });

  it("rejects a malformed payerSecretKey at client creation", () => {
    expect(() => createSolanaClient({ payerSecretKey: "not-base64!!" })).toThrow(
      /invalid `payerSecretKey`/i,
    );
  });

  it("rejects a payerSecretKey that is not 64 bytes (a bare 32-byte seed)", () => {
    const { secretKey } = nacl.sign.keyPair();

    expect(() =>
      createSolanaClient({
        payerSecretKey: Buffer.from(secretKey.slice(0, 32)).toString("base64"),
      }),
    ).toThrow(/invalid `payerSecretKey`/i);
  });

  it("rejects a payerSecretKey whose public half does not match its seed", () => {
    const { secretKey } = nacl.sign.keyPair();
    const mismatched = Uint8Array.from(secretKey);
    mismatched[63] = (mismatched[63] ?? 0) ^ 1;

    expect(() =>
      createSolanaClient({ payerSecretKey: Buffer.from(mismatched).toString("base64") }),
    ).toThrow(/invalid `payerSecretKey`/i);
  });
});
