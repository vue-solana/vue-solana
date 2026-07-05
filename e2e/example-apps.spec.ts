import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
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
      }

      return wallet;
    }
  });
}
