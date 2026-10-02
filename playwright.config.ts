import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
const NEXT_PORT = 4174;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    launchOptions: { args: ["--no-sandbox"] },
  },
  projects: [
    { name: "vite-spa", testMatch: /editor\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
    {
      name: "next",
      testMatch: /next\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${NEXT_PORT}` },
    },
  ],
  webServer: [
    {
      // The SPA is built from the *built package* (dist), like a consumer would.
      command: "pnpm --filter e2e-vite-spa run build && node e2e/server/spa-server.mjs",
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
    },
    {
      // Next.js (webpack) consumes the same built package: SSR, RSC and the Edge runtime.
      command: "pnpm --filter e2e-next-app run build && pnpm --filter e2e-next-app run start",
      url: `http://localhost:${NEXT_PORT}/client`,
      reuseExistingServer: !process.env.CI,
      timeout: 360_000,
      gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
    },
  ],
});
