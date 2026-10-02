import { defineConfig } from "tsup";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/**
 * Third-party stylesheets (react-day-picker, KaTeX) must end up inside
 * dist/editor/index.css, not as `import "pkg/style.css"` statements in the JS:
 * plain Node (SSR) cannot import .css files.
 */
const bundlePackageCss = {
  name: "bundle-package-css",
  setup(build: any) {
    build.onResolve({ filter: /^[^./].*\.css$/ }, (args: any) => {
      if (args.kind === "url-token") return undefined;
      return { path: require.resolve(args.path, { paths: [args.resolveDir] }) };
    });
  },
};

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
    skipNodeModulesBundle: false,
    // Everything in dependencies/peerDependencies stays external (tsup default),
    // except package stylesheets, which are folded into dist/editor/index.css.
    noExternal: [/\.css$/],
    esbuildPlugins: [bundlePackageCss],
    loader: {
      ".woff": "file",
      ".woff2": "file",
      ".ttf": "file",
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
