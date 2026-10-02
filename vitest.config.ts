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
          },
        },
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.{ts,tsx}"],
        },
      },
      {
        // Differential tests: the DOM-free renderer vs. Lexical's own
        // exportDOM pipeline running on the real editor nodes.
        extends: false,
        resolve: {
          alias: {
            "@blog/core": src("core/index.ts"),
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
    ],
  },
});
