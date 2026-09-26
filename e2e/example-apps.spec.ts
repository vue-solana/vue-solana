import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  expectNoPageErrors,
  isRealRpcRun,
  mockSolanaRpc,
  mockSolanaSubscriptions,
  waitForRpcConnected,
} from "./helpers";

const appNames: Record<string, string> = {
  "vue-vite": "Vue Solana Example App",
  nuxt: "Nuxt Solana Test App",
};

test.beforeEach(async ({ page }) => {
  if (!isRealRpcRun()) {
    await mockSolanaRpc(page);
  }
});

test("loads the example dashboard and RPC state", async ({ page }, testInfo) => {
  await expectNoPageErrors(page, async () => {
    await page.goto("/");
    await expect(page.getByTestId("hero")).toContainText(appNames[testInfo.project.name]);
    await expect(page.getByTestId("plugin-installed")).toHaveText("Yes");
    await expect(page.getByTestId("rpc-cluster")).toHaveText("devnet");
    await expect(page.getByTestId("rpc-endpoint")).toHaveText("https://api.devnet.solana.com");
    await waitForRpcConnected(page);
    await expect(page.getByTestId("rpc-latest-blockhash")).not.toHaveText("Not loaded yet");
  });
});

test("runs direct RPC and balance interactions", async ({ page }) => {
  await page.goto("/");

  await waitForRpcConnected(page);

  await page.getByTestId("load-blockhash").click();
  await expect(page.getByTestId("blockhash-result")).toContainText("Blockhash:");

  await page.getByTestId("refresh-balance").click();

  if (isRealRpcRun()) {
    await expect(page.getByTestId("balance-lamports")).toHaveText(/^\s*Lamports: \d+$/);
    await expect(page.getByTestId("balance-sol")).toContainText("SOL:");
  } else {
    await expect(page.getByTestId("balance-lamports")).toHaveText("Lamports: 1000000000");
    await expect(page.getByTestId("balance-sol")).toHaveText("SOL: 1 SOL");
  }
});

test("keeps wallet and transfer flows safe without a browser wallet", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("wallet-message")).toHaveText(
    "Wallet discovery has not been loaded yet.",
  );
  await expect(page.getByTestId("wallet-count")).toHaveText("0");
  await expect(page.getByTestId("wallet-configured")).toHaveText("No");
  await expect(page.getByTestId("wallet-public-key")).toHaveText("Not connected");
  await expect(page.getByTestId("message-capability")).toHaveText("No");
  await expect(page.getByTestId("sign-message")).toBeDisabled();
  await expect(page.getByTestId("message-disabled-reason")).toHaveText(
    "Select a discovered wallet first.",
  );
  await expect(page.getByTestId("connect-wallet")).toBeDisabled();
  await expect(page.getByTestId("send-transfer")).toBeDisabled();
  await expect(page.getByTestId("transfer-disabled-reason")).toHaveText(
    "Select a discovered wallet first.",
  );

  await page.getByTestId("load-wallets").click();
  await expect(page.getByTestId("wallet-message")).toContainText("No wallets detected.");
  await expect(page.getByTestId("wallet-count")).toHaveText("0");
});

test("discovers, selects, connects, signs, and disconnects a mocked Wallet Standard wallet", async ({
  page,
}) => {
  await registerMockWallets(page);
  await page.goto("/");

  await page.getByTestId("load-wallets").click();
  await expect(page.getByTestId("wallet-count")).toHaveText("2");

  await page.getByRole("button", { name: /Mock Signer Wallet/ }).click();
  await expect(page.getByTestId("selected-wallet")).toHaveText("Mock Signer Wallet");
  await expect(page.getByTestId("wallet-configured")).toHaveText("Yes");

  await page.getByTestId("connect-wallet").click();
  await expect(page.getByTestId("wallet-public-key")).toHaveText(
    "11111111111111111111111111111111",
  );
  await expect(page.getByTestId("message-wallet-ready")).toHaveText("Yes");
  await expect(page.getByTestId("message-capability")).toHaveText("Yes");
  await expect(page.getByTestId("sign-message")).toBeEnabled();

  await page.getByTestId("sign-message").click();
  await expect(page.getByTestId("message-signature")).toHaveText("Signature: AQIDBAUGBwg=");
  await expect(page.getByTestId("signed-message")).toContainText("Signed message:");

  await page.getByTestId("disconnect-wallet").click();
  await expect(page.getByTestId("wallet-public-key")).toHaveText("Not connected");
  await expect(page.getByTestId("message-wallet-ready")).toHaveText("No");
  await expect(page.getByTestId("sign-message")).toBeDisabled();
});

test("renders unsupported message-signing capability for mocked wallets", async ({ page }) => {
  await registerMockWallets(page);
  await page.goto("/");

  await page.getByTestId("load-wallets").click();
  await page.getByRole("button", { name: /Mock Readonly Wallet/ }).click();
  await page.getByTestId("connect-wallet").click();

  await expect(page.getByTestId("wallet-public-key")).toHaveText(
    "11111111111111111111111111111111",
  );
  await expect(page.getByTestId("message-capability")).toHaveText("No");
  await expect(page.getByTestId("sign-message")).toBeDisabled();
  await expect(page.getByTestId("message-disabled-reason")).toHaveText(
    "Selected wallet does not support message signing.",
  );

  await page.getByTestId("disconnect-wallet").click();
  await expect(page.getByTestId("wallet-public-key")).toHaveText("Not connected");
});

test("renders submitted-vs-confirmed transaction state", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("transfer-panel")).toContainText("waits for confirmed commitment");
  await expect(page.getByTestId("transfer-signature")).toHaveText("Signature: No signature yet");
  await expect(page.getByTestId("transfer-confirmation-state")).toHaveText("idle");
  await expect(page.getByTestId("transfer-explorer-link")).toHaveCount(0);
});

test("renders live request and slot subscription data", async ({ page }, testInfo) => {
  if (isRealRpcRun()) {
    test.skip(true, "Live panels are deterministic only against the RPC mocks");
  }

  const subscriptions = await mockSolanaSubscriptions(page);
  await page.goto("/");

  await expect(page.getByTestId("live-panels")).toBeVisible();

  // useRequest: seeded from mocked getBalance + getVersion.
  await expect(page.getByTestId("request-status")).toHaveText("success");
  await expect(page.getByTestId("request-data")).toContainText("1 SOL");
  await expect(page.getByTestId("request-data")).toContainText("solana-core 2.1.0");

  // useSubscription: slot notifications stream over the mocked websocket.
  await expect(page.getByTestId("subscription-status")).toHaveText("loaded");
  await expect(page.getByTestId("subscription-data")).toContainText("Slot 2400");

  const initialSlotText = await page.getByTestId("subscription-data").textContent();
  subscriptions.pushSlotNotification(24_042, 24_040);
  await expect(page.getByTestId("subscription-data")).toContainText("Slot 24042");
  expect(initialSlotText).not.toContain("24042");

  // Both apps mount the same panels, so the count is app-agnostic.
  expect(subscriptions.openSubscriptionCount()).toBeGreaterThanOrEqual(1);

  // Changing the address re-fires the request; the mock answers identically.
  await page.getByTestId("tracked-address").fill("11111111111111111111111111111111");
  await expect(page.getByTestId("request-status")).toHaveText("success");
  await expect(page.getByTestId("request-data")).toContainText("1 SOL");

  void testInfo;
});

test("seeds tracked data from the fetch and updates it from notifications", async ({ page }) => {
  if (isRealRpcRun()) {
    test.skip(true, "Live panels are deterministic only against the RPC mocks");
  }

  const subscriptions = await mockSolanaSubscriptions(page);
  await page.goto("/");

  // useTrackedData: seeded by mocked getAccountInfo (42 SOL), then updated by
  // an accountNotification pushed over the mocked websocket.
  await expect(page.getByTestId("tracked-status")).toHaveText("loaded");
  await expect(page.getByTestId("tracked-data")).toContainText("Lamports 42000000000");
  await expect(page.getByTestId("tracked-data")).toContainText("slot 123456");

  subscriptions.pushAccountNotification(43_000_000_000, 123_457);
  await expect(page.getByTestId("tracked-data")).toContainText("Lamports 43000000000");
  await expect(page.getByTestId("tracked-data")).toContainText("slot 123457");
});

test("funds the client payer and sends single and batch transactions", async ({ page }) => {
  if (isRealRpcRun()) {
    test.skip(true, "Client action coverage requires the deterministic RPC and socket mocks");
  }

  const rpc = await mockSolanaSubscriptions(page);
  const connectionChecks: string[] = [];

  page.on("console", (message) => {
    if (message.text().includes("[Vue Solana] Checking RPC connection")) {
      connectionChecks.push(message.text());
    }
  });

  await page.goto("/");

  await expect(page.getByTestId("payer-status")).toHaveText(/^funding required · /);
  await expect(page.getByTestId("payer-fund-result")).toHaveText("Payer not funded");

  await page.getByTestId("payer-fund-button").click();
  await expect(page.getByTestId("payer-status")).toHaveText(/^funded · /);
  await expect(page.getByTestId("payer-fund-result")).toHaveText(/^Payer funded · Signature /);

  await page.getByTestId("send-transaction-button").click();
  await expect(page.getByTestId("send-transaction-status")).toHaveText("sent");
  await expect(page.getByTestId("send-transaction-data")).toHaveText(/^Signature /);
  await expect(page.getByTestId("send-transaction-error")).toHaveCount(0);

  await page.getByTestId("send-transactions-button").click();
  await expect(page.getByTestId("send-transactions-status")).toHaveText("sent");
  await expect(page.getByTestId("send-transactions-data")).toHaveText(/^Signature /);
  await expect(page.getByTestId("send-transactions-error")).toHaveCount(0);

  const calls = rpc.rpcMethodCalls();
  const callCount = (method: string) => calls.filter((call) => call === method).length;

  expect(calls).toEqual(
    expect.arrayContaining([
      "requestAirdrop",
      "getEpochInfo",
      "getLatestBlockhash",
      "getSignatureStatuses",
      "sendTransaction",
      "simulateTransaction",
    ]),
  );
  expect(callCount("requestAirdrop")).toBe(1);
  expect(callCount("getEpochInfo")).toBeGreaterThanOrEqual(2);
  expect(callCount("getLatestBlockhash")).toBeGreaterThanOrEqual(2);
  expect(callCount("getSignatureStatuses")).toBeGreaterThanOrEqual(3);
  expect(callCount("sendTransaction")).toBeGreaterThanOrEqual(2);
  expect(callCount("simulateTransaction")).toBeGreaterThanOrEqual(2);
  // Each `createSolanaPlugin` install runs one connection check. Two installs
  // mean two wallet subscriptions and two health checks for a single app, so
  // pin it to exactly one.
  expect(connectionChecks).toHaveLength(1);
});

test("signs in with the mocked SIWS wallet and surfaces the account", async ({ page }) => {
  if (isRealRpcRun()) {
    test.skip(true, "SIWS panel requires the mock wallet");
  }

  await mockSolanaSubscriptions(page);
  await registerMockWallets(page);
  await page.goto("/");

  await expect(page.getByTestId("sign-in-status")).toHaveText("idle");
  await expect(page.getByTestId("sign-in-button")).toBeDisabled();

  await page.getByTestId("load-wallets").click();
  await page.getByRole("button", { name: /Mock Signer Wallet/ }).click();
  await page.getByTestId("connect-wallet").click();
  await expect(page.getByTestId("wallet-public-key")).toHaveText(
    "11111111111111111111111111111111",
  );

  await expect(page.getByTestId("sign-in-button")).toBeEnabled();
  await page.getByTestId("sign-in-button").click();

  await expect(page.getByTestId("sign-in-status")).toHaveText("signed-in");
  await expect(page.getByTestId("sign-in-result")).toContainText(
    "Signed in as 11111111111111111111111111111111",
  );
});

test("demonstrates stale-while-revalidate across SWR card remounts", async ({ page }) => {
  if (isRealRpcRun()) {
    test.skip(true, "Live panels are deterministic only against the RPC mocks");
  }

  await mockSolanaSubscriptions(page);
  await page.goto("/");

  // First mount: fetching -> success with request #1.
  await expect(page.getByTestId("swr-status")).toHaveText("success");
  await expect(page.getByTestId("swr-data")).toContainText("Request #1");

  // Hide and re-show: the card remounts, shows the cached value immediately,
  // then revalidates into request #2.
  await page.getByTestId("swr-toggle").click();
  await expect(page.getByTestId("swr-data")).toHaveText("Card hidden");

  await page.getByTestId("swr-toggle").click();
  await expect(page.getByTestId("swr-data")).toContainText("Request #1");
  await expect(page.getByTestId("swr-data")).toContainText("Request #2");
});

test("runs the mock transaction helper", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("mock-transaction-signature")).toHaveText(
    "Signature: No signature yet",
  );
  await page.getByTestId("run-mock-transaction").click();
  await expect(page.getByTestId("mock-transaction-signature")).toContainText(
    "Signature: mock-transaction-",
  );
});

async function registerMockWallets(page: Page) {
  await page.addInitScript(() => {
    const account = {
      address: "11111111111111111111111111111111",
      publicKey: new Uint8Array(32),
      chains: ["solana:devnet"],
      features: [],
    };
    const wallets = [
      createMockWallet("Mock Signer Wallet", true),
      createMockWallet("Mock Readonly Wallet", false),
    ];

    for (const wallet of wallets) {
      window.addEventListener("wallet-standard:app-ready", (event) => {
        const detail = (event as CustomEvent<{ register(wallet: unknown): void }>).detail;
        detail.register(wallet);
      });
      window.dispatchEvent(new CustomEvent("wallet-standard:register-wallet", { detail: wallet }));
    }

    function createMockWallet(name: string, canSignMessage: boolean) {
      const wallet = {
        version: "1.0.0",
        name,
        icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=",
        chains: ["solana:devnet"],
        accounts: [] as (typeof account)[],
        features: {
          "standard:connect": {
            version: "1.0.0",
            connect: async () => {
              wallet.accounts = [account];
              return { accounts: wallet.accounts };
            },
          },
          "standard:disconnect": {
            version: "1.0.0",
            disconnect: async () => {
              wallet.accounts = [];
            },
          },
          "standard:events": {
            version: "1.0.0",
            on: () => () => undefined,
          },
        } as Record<string, unknown>,
      };

      if (canSignMessage) {
        wallet.features["solana:signMessage"] = {
          version: "1.0.0",
          signMessage: async ({ message }: { message: Uint8Array }) => [
            { signedMessage: message, signature: Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]) },
          ],
        };
        wallet.features["solana:signIn"] = {
          version: "1.0.0",
          signIn: async (input?: { domain?: string; statement?: string }) => {
            void input;

            return [
              {
                account: {
                  address: "11111111111111111111111111111111",
                  publicKey: new Uint8Array(32),
                  chains: ["solana:devnet"],
                  features: [],
                  label: "Mock Signer Wallet",
                },
                signedMessage: new TextEncoder().encode("Welcome to Vue Solana"),
                signature: Uint8Array.from([9, 8, 7, 6, 5, 4, 3, 2]),
                signatureType: "ed25519",
              },
            ];
          },
        };
      }

      return wallet;
    }
  });
}
