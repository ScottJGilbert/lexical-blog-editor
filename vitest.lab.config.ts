import { defineConfig } from "vitest/config";

/**
 * The "lab": suites that need real runtimes (workerd, ...) and are too slow or
 * heavy for the default `pnpm test`. See docs/testing.md.
 */
export default defineConfig({
  test: {
    projects: [
      {
        extends: false,
        test: {
          name: "lab-workerd",
          environment: "node",
          include: ["tests/lab/workerd.test.ts"],
          testTimeout: 60_000,
          hookTimeout: 240_000,
        },
      },
    ],
  },
});
