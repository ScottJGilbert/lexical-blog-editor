/**
 * Tree-shaking / portability guarantees, checked on the *built* output by
 * bundling every public entry point the way a consumer's bundler would.
 * Needs `pnpm build` first (like the env tests).
 */
import { describe, expect, it } from "vitest";
import { build } from "esbuild";
import { join } from "node:path";

const pkg = join(__dirname, "..", "..", "packages", "lexical-blog-editor");

async function bundle(entry: string, opts: { platform: "neutral" | "browser"; external?: string[] }) {
  const result = await build({
    entryPoints: [join(pkg, "dist", entry)],
    bundle: true,
    minify: true,
    write: false,
    metafile: true,
    format: "esm",
    platform: opts.platform,
    mainFields: ["module", "main"],
    external: opts.external ?? [],
    logLevel: "silent",
    loader: { ".css": "empty" },
  });
  const inputs = Object.keys(result.metafile!.inputs);
  const bytes = result.outputFiles[0].contents.byteLength;
  return { inputs, bytes, has: (needle: string) => inputs.some((i) => i.includes(needle)) };
}

describe("environment-agnostic entry points", () => {
  // `platform: neutral` with nothing external fails to build if the entry
  // imports Node built-ins or an unresolvable package: a strong portability check.
  it.each(["core/index.js", "render/index.js"])("%s bundles standalone with zero dependencies", async (entry) => {
    const b = await bundle(entry, { platform: "neutral" });
    for (const forbidden of ["node_modules/react", "node_modules/lexical", "@lexical", "node_modules/katex", "jsdom", "dompurify"]) {
      expect(b.has(forbidden), `${entry} pulled in ${forbidden}`).toBe(false);
    }
    expect(b.bytes).toBeLessThan(40_000);
  });

  it("render/katex adds katex and nothing else heavy", async () => {
    const b = await bundle("render/katex.js", { platform: "neutral" });
    expect(b.has("node_modules/katex")).toBe(true);
    expect(b.has("node_modules/react")).toBe(false);
    expect(b.has("node_modules/@lexical")).toBe(false);
  });

  it("the CJS builds are equally dependency-free", async () => {
    const result = await build({
      entryPoints: [join(pkg, "dist/render/index.cjs")],
      bundle: true, write: false, metafile: true, platform: "neutral", format: "esm", logLevel: "silent",
    });
    expect(Object.keys(result.metafile!.inputs).some((i) => i.includes("node_modules"))).toBe(false);
  });
});

describe("viewer entry points", () => {
  it("react viewer needs only React (no Lexical, no katex, no editor)", async () => {
    const b = await bundle("react/index.js", { platform: "neutral", external: ["react", "react/jsx-runtime"] });
    for (const forbidden of ["node_modules/lexical", "node_modules/@lexical", "node_modules/katex", "jsdom", "dompurify", "html-react-parser", "react-tweet"]) {
      expect(b.has(forbidden), `react viewer pulled in ${forbidden}`).toBe(false);
    }
    expect(b.bytes).toBeLessThan(45_000);
  });

  it("html viewer needs no React and no Lexical", async () => {
    const b = await bundle("html/index.js", { platform: "browser" });
    for (const forbidden of ["node_modules/react", "node_modules/lexical", "node_modules/@lexical", "node_modules/katex"]) {
      expect(b.has(forbidden), `html viewer pulled in ${forbidden}`).toBe(false);
    }
    expect(b.bytes).toBeLessThan(45_000);
  });

  it("importing only `renderToHtml` from the html viewer is as small as the renderer", async () => {
    const b = await bundle("html/index.js", { platform: "browser" });
    expect(b.bytes).toBeLessThan(45_000);
  });
});

describe("editor entry point", () => {
  it("keeps Lexical and React as external peers", async () => {
    const b = await bundle("editor/index.js", {
      platform: "browser",
      external: ["react", "react-dom", "react/jsx-runtime", "react-dom/client", "lexical", "@lexical/*", "katex", "shiki", "@shikijs/*", "prettier*", "yjs", "y-websocket", "date-fns*", "react-day-picker*", "react-error-boundary", "@floating-ui/*", "lodash-es"],
    });
    // The editor bundle must contain only this package's code.
    expect(b.inputs.every((i) => !i.includes("node_modules/") || i.includes("lexical-blog-editor"))).toBe(true);
  });
});
