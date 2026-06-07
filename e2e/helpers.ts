import { expect, type Page } from "@playwright/test";

const MOCK_BLOCKHASH = "5v2p4R5H6J7K8L9M1N2P3Q4R5S6T7U8V9W1X2Y3Z4a5b";

export function isRealRpcRun() {
  return process.env.E2E_REAL_RPC === "true";
}

export async function mockSolanaRpc(page: Page) {
  await page.route("https://api.devnet.solana.com/**", async (route) => {
    const request = route.request();

    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders() });
      return;
    }

    const body = request.postDataJSON() as { id?: string | number; method?: string } | undefined;
    const response = createRpcResponse(body?.id ?? 1, body?.method);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: corsHeaders(),
      body: JSON.stringify(response),
    });
  });
}

export async function expectNoPageErrors(page: Page, run: () => Promise<void>) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await run();

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
}

function createRpcResponse(id: string | number, method?: string) {
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
