import { defineConfig, devices } from "@playwright/test";

const isRealRpcRun = process.env.E2E_REAL_RPC === "true";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  // Real-network runs hit public devnet, which rate-limits CI egress IPs
  // (429). Serialise the tests and retry transient failures so a throttled
  // request doesn't fail the whole suite.
  workers: isRealRpcRun ? 1 : undefined,
  retries: isRealRpcRun ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: "pnpm --filter @vue-solana/example-vue-vite preview --host 127.0.0.1 --port 4173",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: !process.env.CI,
    },
    {
      command:
        "NITRO_HOST=127.0.0.1 NITRO_PORT=4174 pnpm --filter @vue-solana/example-nuxt preview",
      url: "http://127.0.0.1:4174",
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [
    {
      name: "vue-vite",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://127.0.0.1:4173",
      },
    },
    {
      name: "nuxt",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://127.0.0.1:4174",
      },
    },
  ],
});
