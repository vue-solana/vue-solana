import { expect, type Page } from "@playwright/test";

const MOCK_BLOCKHASH = "5v2p4R5H6J7K8L9M1N2P3Q4R5S6T7U8V9W1X2Y3Z4a5b";
const MOCK_SIGNATURE =
  "2Ana1pUpv2ZbMVkwF5FXapYeBEjdxDatLn7nvJkhgTSXbs59SyZSx866bXirPgj8QQVB57uxHJBG1YFvkRbFj4T";

export function isRealRpcRun() {
  return process.env.E2E_REAL_RPC === "true";
}

/**
 * Waits until the app's RPC connection check reports "connected".
 *
 * The app runs its connection check once at mount; a single transient devnet
 * failure leaves the status stuck at "error" until the check is re-run. On
 * real-network runs this helper re-triggers the check until devnet answers,
 * so one blip doesn't fail the suite. A no-op against the RPC mocks.
 */
export async function waitForRpcConnected(page: Page) {
  const status = page.getByTestId("rpc-status");
  const checkRpcButton = page.getByTestId("check-rpc");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if ((await status.textContent()) === "connected") {
      return;
    }

    await checkRpcButton.click();

    try {
      await expect(status).toHaveText("connected", { timeout: 8_000 });
      return;
    } catch {
      // Transient failure; the re-check below absorbs it.
    }
  }

  await expect(status).toHaveText("connected");
}

interface RpcMockHarness {
  methodCalls(): readonly string[];
}

const rpcMockHarnesses = new WeakMap<Page, RpcMockHarness>();

export async function mockSolanaRpc(page: Page): Promise<RpcMockHarness> {
  const existingHarness = rpcMockHarnesses.get(page);

  if (existingHarness) {
    return existingHarness;
  }

  const methodCalls: string[] = [];

  await page.route("https://api.devnet.solana.com/**", async (route) => {
    const request = route.request();

    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders() });
      return;
    }

    const body = request.postDataJSON() as
      | { id?: string | number; method?: string; params?: unknown }
      | undefined;

    if (body?.method) {
      methodCalls.push(body.method);
    }

    const response = createRpcResponse(body?.id ?? 1, body?.method, body?.params);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: corsHeaders(),
      body: JSON.stringify(response),
    });
  });

  const harness: RpcMockHarness = { methodCalls: () => methodCalls };
  rpcMockHarnesses.set(page, harness);

  return harness;
}

/**
 * Drives notifications into open mocked subscription sockets.
 */
export interface SubscriptionHarness {
  rpcMethodCalls(): readonly string[];
  /**
   * Push an `accountNotification` (lamports changed) to every open account
   * subscription, as if the tracked account just received SOL.
   */
  pushAccountNotification(lamports: number, slot: number): void;
  /**
   * Push a `slotNotification` to every open slot subscription.
   */
  pushSlotNotification(slot: number, root: number): void;
  /**
   * Number of sockets with at least one active subscription.
   */
  openSubscriptionCount(): number;
}

/**
 * Mocks the devnet websocket subscription endpoint used by `useSubscription`
 * and the stream half of `useTrackedData` (Kit RPC subscriptions protocol).
 *
 * Wire protocol: the client sends `{jsonrpc, id, method: "<method>Subscribe",
 * params}` and the server answers `{jsonrpc, id, result: <subscriptionId>}`;
 * updates arrive as `{jsonrpc, method: "<method>Notification", params:
 * {subscription, result}}`. Kit's `{method: "ping"}` keepalives carry no id
 * and are ignored.
 */
export async function mockSolanaSubscriptions(page: Page): Promise<SubscriptionHarness> {
  const rpc = await mockSolanaRpc(page);

  interface OpenSocket {
    send(message: string): unknown;
    subscriptions: Map<number, string>;
  }

  const openSockets: OpenSocket[] = [];
  let nextSubscriptionId = 1;

  await page.routeWebSocket("wss://api.devnet.solana.com/**", (ws) => {
    const socket: OpenSocket = { send: (message) => ws.send(message), subscriptions: new Map() };
    openSockets.push(socket);

    ws.onClose(() => {
      const index = openSockets.indexOf(socket);

      if (index >= 0) {
        openSockets.splice(index, 1);
      }
    });

    ws.onMessage((message) => {
      let parsed: { id?: number | string; method?: string; params?: unknown };

      try {
        parsed = JSON.parse(message as string) as typeof parsed;
      } catch {
        return;
      }

      const method = parsed.method;

      if (!method?.endsWith("Subscribe")) {
        // Keepalive pings and non-subscribe frames are ignored.
        return;
      }

      const id = parsed.id ?? 0;
      const subscriptionId = nextSubscriptionId++;
      socket.subscriptions.set(subscriptionId, method);
      ws.send(JSON.stringify({ jsonrpc: "2.0", id, result: subscriptionId }));

      if (method === "slotSubscribe") {
        // Deliver an immediate slot notification so `useSubscription` shows
        // data without a test-driven push.
        const slot = 24_000 + subscriptionId;
        sendNotification(ws, "slotNotification", subscriptionId, {
          slot,
          root: slot - 2,
          parent: slot - 1,
        });
      }
    });
  });

  return {
    rpcMethodCalls: rpc.methodCalls,
    pushAccountNotification(lamports: number, slot: number) {
      const notification = {
        context: { slot },
        value: {
          lamports: String(lamports),
          // base64-encoded empty data (accountNotifications was requested with
          // the base64 encoding in the example panels).
          data: ["", "base64"],
          owner: "11111111111111111111111111111111",
          executable: false,
          rentEpoch: "18446744073709551615",
          space: 0,
        },
      };

      for (const socket of openSockets) {
        for (const [subscriptionId, method] of socket.subscriptions) {
          if (method === "accountSubscribe") {
            socket.send(
              JSON.stringify({
                jsonrpc: "2.0",
                method: "accountNotification",
                params: { subscription: subscriptionId, result: notification },
              }),
            );
          }
        }
      }
    },
    pushSlotNotification(slot: number, root: number) {
      for (const socket of openSockets) {
        for (const [subscriptionId, method] of socket.subscriptions) {
          if (method === "slotSubscribe") {
            socket.send(
              JSON.stringify({
                jsonrpc: "2.0",
                method: "slotNotification",
                params: { subscription: subscriptionId, result: { slot, root, parent: root } },
              }),
            );
          }
        }
      }
    },
    openSubscriptionCount() {
      return openSockets.filter((socket) => socket.subscriptions.size > 0).length;
    },
  };
}

function sendNotification(
  ws: { send(message: string): unknown },
  method: string,
  subscriptionId: number,
  result: unknown,
) {
  ws.send(
    JSON.stringify({
      jsonrpc: "2.0",
      method,
      params: { subscription: subscriptionId, result },
    }),
  );
}

export async function expectNoPageErrors(page: Page, run: () => Promise<void>) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() !== "error") {
      return;
    }

    // On real-network runs a transient devnet failure logs a connection
    // error before `waitForRpcConnected` retries to success; just re-running
    // the check proves connectivity, so those logs are ignored.
    if (isRealRpcRun() && message.text().includes("[Vue Solana] Connection failed")) {
      return;
    }

    consoleErrors.push(message.text());
  });

  await run();

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
}

function createRpcResponse(id: string | number, method?: string, params?: unknown) {
  if (method === "getLatestBlockhash") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        context: { slot: 123456 },
        value: {
          blockhash: MOCK_BLOCKHASH,
          lastValidBlockHeight: 654321,
        },
      },
    };
  }

  if (method === "getEpochInfo") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        absoluteSlot: 123456,
        blockHeight: 120000,
        epoch: 500,
        slotIndex: 1000,
        slotsInEpoch: 432000,
        transactionCount: null,
      },
    };
  }

  if (method === "getBalance") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        context: { slot: 123456 },
        value: 1000000000,
      },
    };
  }

  if (method === "getVersion") {
    return {
      jsonrpc: "2.0",
      id,
      result: { "solana-core": "2.1.0", "feature-set": 3695458837 },
    };
  }

  if (method === "getAccountInfo") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        context: { slot: 123456 },
        value: {
          lamports: 42_000_000_000,
          data: ["", "base64"],
          owner: "11111111111111111111111111111111",
          executable: false,
          rentEpoch: "18446744073709551615",
          space: 0,
        },
      },
    };
  }

  if (method === "simulateTransaction") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        context: { slot: 123457 },
        value: {
          err: null,
          fee: 5000,
          loadedAccountsDataSize: 0,
          loadedAddresses: { readonly: [], writable: [] },
          logs: ["Program Memo invoke [1]"],
          postBalances: [1000000000],
          postTokenBalances: null,
          preBalances: [1000000000],
          preTokenBalances: null,
          replacementBlockhash: {
            blockhash: MOCK_BLOCKHASH,
            lastValidBlockHeight: 654321,
          },
          returnData: null,
          unitsConsumed: 150,
        },
      },
    };
  }

  if (method === "sendTransaction" || method === "requestAirdrop") {
    return { jsonrpc: "2.0", id, result: MOCK_SIGNATURE };
  }

  if (method === "getSignatureStatuses") {
    const signatures =
      Array.isArray(params) && Array.isArray(params[0]) ? (params[0] as unknown[]) : [];

    return {
      jsonrpc: "2.0",
      id,
      result: {
        context: { slot: 123457 },
        value: signatures.map(() => ({
          slot: 123457,
          confirmations: 1,
          err: null,
          confirmationStatus: "finalized",
          status: { Ok: null },
        })),
      },
    };
  }

  if (method === "getHealth") {
    return { jsonrpc: "2.0", id, result: "ok" };
  }

  return { jsonrpc: "2.0", id, result: null };
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
  };
}
