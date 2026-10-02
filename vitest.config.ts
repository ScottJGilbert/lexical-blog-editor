import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const src = (p: string) =>
  fileURLToPath(new URL(`./packages/lexical-blog-editor/src/${p}`, import.meta.url));

export default defineConfig({
  test: {
    projects: [
      {
        // Pure unit tests against the *source* of the shared layers.
        extends: false,
        resolve: {
          alias: {
            "@blog/core": src("core/index.ts"),
            "@blog/render": src("render/index.ts"),
            "@blog/react": src("react/index.tsx"),
            "@blog/html": src("html/index.ts"),
            "@blog/editor-upload": src("editor/upload/index.ts"),
            "@blog/editor-extensions": src("editor/extensions/index.ts"),
          },
        },
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.{ts,tsx}"],
          exclude: ["tests/unit/**/*.dom.test.{ts,tsx}"],
        },
      },
      {
        // Unit tests that need a DOM (HTML viewer, custom element, safety checks).
        extends: false,
        resolve: {
          alias: {
            "@blog/core": src("core/index.ts"),
            "@blog/render": src("render/index.ts"),
            "@blog/react": src("react/index.tsx"),
            "@blog/html": src("html/index.ts"),
          },
        },
        test: {
          name: "unit-dom",
          environment: "jsdom",
          include: ["tests/unit/**/*.dom.test.{ts,tsx}"],
        },
      },
      {
        // Differential tests: the DOM-free renderer vs. Lexical's own
        // exportDOM pipeline running on the real editor nodes.
        extends: false,
        resolve: {
          alias: {
            "@blog/core": src("core/index.ts"),
            "@blog/render/katex": src("render/katex.ts"),
            "@blog/render": src("render/index.ts"),
            "@blog/editor": src("editor"),
          },
        },
        test: {
          name: "oracle",
          environment: "jsdom",
          include: ["tests/oracle/**/*.test.{ts,tsx}"],
          testTimeout: 30000,
        },
      },
      {
        // Real Node resolution, real HTTP, edge VM: see tests/node.
        extends: false,
        test: {
          name: "node-native",
          environment: "node",
          include: ["tests/node/**/*.test.ts"],
          testTimeout: 60_000,
          hookTimeout: 90_000,
        },
      },
      // The same cross-environment suite against the *built* package.
      ...(["node", "jsdom", "edge-runtime"] as const).map((environment) => ({
        extends: false as const,
        define: { __TEST_ENV__: JSON.stringify(environment) },
        test: {
          name: `env-${environment === "edge-runtime" ? "edge" : environment}`,
          environment,
          include: ["tests/env/**/*.test.{ts,tsx}"],
          ...(environment === "edge-runtime"
            ? { server: { deps: { inline: [/lexical-blog-editor/] } } }
            : {}),
        },
      })),
    ],
  },
});
