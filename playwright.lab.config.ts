import { defineConfig, devices } from "@playwright/test";

/**
 * The "lab": the Next.js specs against Turbopack (Next 15.5 and 16, production
 * build and dev server) and, for contrast, Next 16 on webpack, and Next 16 running inside real workerd (OpenNext).
 *
 * One target runs at a time (`LAB_TARGET=<name>`); `node scripts/lab-next.mjs`
 * loops over all of them. Heavy by design, so it is not part of `pnpm test:e2e`.
 */
interface Target {
  port: number;
  mode: "prod" | "dev";
  app: "next-app" | "next16-app" | "next-cloudflare";
  /** Whether the runtime has Next's Edge runtime (OpenNext on Workers does not). */
  edge: boolean;
  /** next-cloudflare only: how the editor page is built, and the worker size budget it must fit. */
  workerVariant?: "naive" | "lean";
  maxWorkerGzipKiB?: number;
  /** Command(s) that make the server listen on `port`. */
  command: string;
  distDir: string;
}

const next15 = (script: string, port: number) => `pnpm run ${script} && pnpm exec next start -p ${port}`;

export const targets: Record<string, Target> = {
  "next15-turbopack": { edge: true, port: 4181, mode: "prod", app: "next-app", distDir: ".next-turbo", command: next15("build:turbo", 4181) },
  "next15-turbopack-dev": { edge: true, port: 4182, mode: "dev", app: "next-app", distDir: ".next-turbo-dev", command: "pnpm exec next dev --turbopack -p 4182" },
  "next16-turbopack": { edge: true, port: 4183, mode: "prod", app: "next16-app", distDir: ".next-turbo", command: "pnpm run build && pnpm exec next start -p 4183" },
  "next16-turbopack-dev": { edge: true, port: 4184, mode: "dev", app: "next16-app", distDir: ".next-turbo-dev", command: "pnpm run sync && pnpm exec next dev -p 4184" },
  "next16-webpack": { edge: true, port: 4185, mode: "prod", app: "next16-app", distDir: ".next-webpack", command: "pnpm run build:webpack && pnpm exec next start -p 4185" },
  // Next 16 (Turbopack) built by OpenNext and served by `wrangler dev` inside real workerd.
  // `naive` imports the Editor straight into a client page (so Next's server bundle includes it);
  // `lean` loads it with next/dynamic({ ssr: false }). The size budgets document the difference:
  // naive fits the paid plan (10 MiB gzip) but not the free one (3 MiB); lean fits both comfortably.
  "next16-workerd": { port: 4186, mode: "prod", edge: false, app: "next-cloudflare", distDir: ".next", workerVariant: "naive", maxWorkerGzipKiB: 8 * 1024, command: "pnpm run cf:build && pnpm exec opennextjs-cloudflare preview --port 4186 --ip 127.0.0.1" },
  "next16-workerd-lean": { port: 4187, mode: "prod", edge: false, app: "next-cloudflare", distDir: ".next", workerVariant: "lean", maxWorkerGzipKiB: 2 * 1024, command: "pnpm run cf:build && pnpm exec opennextjs-cloudflare preview --port 4187 --ip 127.0.0.1" },
};

const selected = process.env.LAB_TARGET ?? "next16-turbopack";
const target = targets[selected];
if (!target) throw new Error(`Unknown LAB_TARGET "${selected}". Choose from: ${Object.keys(targets).join(", ")}`);

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /next\.spec\.ts/,
  // Dev servers compile every route on first hit.
  timeout: target.mode === "dev" ? 120_000 : 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: true,
  workers: target.mode === "dev" ? 2 : undefined,
  retries: 0,
  reporter: "list",
  outputDir: `test-results/lab-${selected}`,
  use: {
    baseURL: `http://localhost:${target.port}`,
    trace: "retain-on-failure",
    launchOptions: { args: ["--no-sandbox"] },
  },
  projects: [
    {
      name: selected,
      metadata: { mode: target.mode, edge: target.edge, maxWorkerGzipKiB: target.maxWorkerGzipKiB },
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: target.command,
    cwd: `e2e/apps/${target.app}`,
    env: { NEXT_DIST_DIR: target.distDir, NEXT_TELEMETRY_DISABLED: "1", LAB_VARIANT: target.workerVariant ?? "" },
    url: `http://localhost:${target.port}/client`,
    reuseExistingServer: false,
    timeout: 600_000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
  },
});
