import { defineConfig } from "tsup";

const shared = {
  format: ["esm", "cjs"] as const,
  target: "es2020",
  sourcemap: true,
  clean: false,
  treeshake: true,
  // Never bundle dependencies: consumers' bundlers dedupe and tree-shake them.
  skipNodeModulesBundle: true,
};

export default defineConfig([
  // Environment-agnostic layers: no React, no DOM, no Lexical.
  {
    ...shared,
    entry: {
      "core/index": "src/core/index.ts",
      "render/index": "src/render/index.ts",
      "render/katex": "src/render/katex.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    splitting: true,
    platform: "neutral",
    mainFields: ["module", "main"],
  },
  // React / DOM layers.
  {
    ...shared,
    entry: {
      "react/index": "src/react/index.tsx",
      "html/index": "src/html/index.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    splitting: true,
    platform: "neutral",
    mainFields: ["module", "main"],
  },
  // The editor (client-side). Styles are emitted as dist/editor/index.css.
  {
    ...shared,
    entry: { "editor/index": "src/editor/index.tsx" },
    format: ["esm", "cjs"],
    dts: true,
    platform: "browser",
    // One bundle => one stylesheet (dist/editor/index.css) covering lazy parts too.
    splitting: false,
    // rollup's tree-shaking pass would drop the "use client" banner.
    treeshake: false,
    banner: { js: '"use client";' },
    loader: {
      ".svg": "dataurl",
      ".png": "dataurl",
      ".gif": "dataurl",
      ".jpg": "dataurl",
    },
    esbuildOptions(options) {
      options.jsx = "automatic";
    },
  },
]);
