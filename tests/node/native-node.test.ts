/**
 * Real Node resolution (no Vite): ESM `import` and CommonJS `require` of every
 * published entry point must load and produce byte-identical output.
 */
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fixtureNames, FIXTURE_DIR } from "../helpers/fixtures";
import { goldenFor } from "../helpers/golden";

const cwd = join(__dirname, "..", "..", "e2e", "apps", "express-server");
const run = (script: string) =>
  JSON.parse(execFileSync(process.execPath, [script, FIXTURE_DIR], { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));

const esm = run("render-all.mjs");
const cjs = run("render-all.cjs");

describe.each([
  ["ESM import", esm],
  ["CommonJS require", cjs],
])("native Node: %s", (_label, result) => {
  for (const name of fixtureNames) {
    it(`render matches the golden: ${name}`, () => {
      expect(result.render[name]).toBe(goldenFor(name, "html"));
    });
    it(`React viewer matches the golden: ${name}`, () => {
      expect(result.react[name]).toBe(goldenFor(name, "react.html"));
    });
  }
  it("exposes the public API", () => {
    expect(result.exports.core).toEqual(expect.arrayContaining(["defineRenderExtension", "h", "sanitizeTree", "resolvePolicy", "defaultRenderTheme"]));
    expect(result.exports.html).toEqual(expect.arrayContaining(["mountViewer", "renderToHtml", "renderToFragment", "defineViewerElement"]));
    expect(result.exports.callout).toEqual(expect.arrayContaining(["CALLOUT_KINDS", "normalizeCalloutKind"]));
  });
});

describe("dual package parity", () => {
  it("ESM and CJS export the same names", () => {
    expect(cjs.exports).toEqual({ ...esm.exports });
  });
  it("ESM and CJS render identically", () => {
    expect(cjs.render).toEqual(esm.render);
    expect(cjs.react).toEqual(esm.react);
  });
  it("the browser-only editor entries are import-safe on the server (SSR)", () => {
    expect(esm.editorImportable).toBe(true);
    expect(esm.calloutEditorImportable).toBe(true);
  });
});
