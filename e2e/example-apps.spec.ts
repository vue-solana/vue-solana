import { expect, test } from "@playwright/test";
import { expectNoPageErrors, isRealRpcRun, mockSolanaRpc } from "./helpers";

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
    await expect(page.getByTestId("rpc-status")).toHaveText("connected");
    await expect(page.getByTestId("rpc-latest-blockhash")).not.toHaveText("Not loaded yet");
  });
});

test("runs direct RPC and balance interactions", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("check-rpc").click();
  await expect(page.getByTestId("rpc-status")).toHaveText("connected");

  await page.getByTestId("load-blockhash").click();
  await expect(page.getByTestId("blockhash-result")).toContainText("Blockhash:");

  await page.getByTestId("refresh-balance").click();

  if (isRealRpcRun()) {
    await expect(page.getByTestId("balance-lamports")).toHaveText(/^Lamports: \d+$/);
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
  await expect(page.getByTestId("connect-wallet")).toBeDisabled();
  await expect(page.getByTestId("send-transfer")).toBeDisabled();
  await expect(page.getByTestId("transfer-disabled-reason")).toHaveText(
    "Select a discovered wallet first.",
  );

  await page.getByTestId("load-wallets").click();
  await expect(page.getByTestId("wallet-message")).toContainText("No wallets detected.");
  await expect(page.getByTestId("wallet-count")).toHaveText("0");
});

test("renders submitted-vs-confirmed transaction state", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("transfer-panel")).toContainText("waits for confirmed commitment");
  await expect(page.getByTestId("transfer-signature")).toHaveText("Signature: No signature yet");
  await expect(page.getByTestId("transfer-confirmation-state")).toHaveText("idle");
  await expect(page.getByTestId("transfer-explorer-link")).toHaveCount(0);
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
