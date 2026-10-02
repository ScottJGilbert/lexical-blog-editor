import { defineConfig } from "tsup";

const shared = {
  format: ["esm", "cjs"] as const,
  sourcemap: true,
  target: "es2020",
  skipNodeModulesBundle: true,
  esbuildOptions(options: { jsx?: string }) {
    options.jsx = "automatic";
  },
};

export default defineConfig([
  // Environment-agnostic halves.
  {
    ...shared,
    format: ["esm", "cjs"],
    entry: { index: "src/index.ts", render: "src/render.ts" },
    dts: true,
    splitting: true,
    treeshake: true,
  },
  // Editor half (client only). rollup's tree-shaking pass would drop the banner.
  {
    ...shared,
    format: ["esm", "cjs"],
    entry: { editor: "src/editor.tsx" },
    dts: true,
    splitting: false,
    treeshake: false,
    banner: { js: '"use client";' },
  },
]);
