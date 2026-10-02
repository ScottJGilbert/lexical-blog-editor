/**
 * A Web-standard (Request -> Response) handler bundled for the browser/worker
 * condition and executed inside Vercel's edge-runtime VM: no Node built-ins,
 * no DOM, no require. This is the closest stand-in for Cloudflare Workers /
 * Vercel Edge / Deno Deploy that runs anywhere.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { build } from "esbuild";
import { EdgeVM } from "@edge-runtime/vm";
import { join } from "node:path";
import { fixtureNames, readFixture } from "../helpers/fixtures";
import { goldenFor } from "../helpers/golden";
import { hostile } from "../helpers/hostile";

const appDir = join(__dirname, "..", "..", "e2e", "apps", "edge-function");
let vm: EdgeVM;
let bundleBytes = 0;

async function call(path: string, state: unknown): Promise<{ status: number; text: string }> {
  (vm.context as any).__body = JSON.stringify({ state });
  const response = await vm.evaluate(
    `__worker.default.fetch(new Request("https://edge.test${path}", { method: "POST", body: __body }))`,
  );
  return { status: response.status, text: await response.text() };
}

beforeAll(async () => {
  const result = await build({
    entryPoints: [join(appDir, "worker.mjs")],
    bundle: true,
    write: false,
    format: "iife",
    globalName: "__worker",
    platform: "browser",
    // Cloudflare (workerd) and Vercel (edge-light) resolve react-dom/server.edge, which needs no MessageChannel.
    conditions: ["workerd", "edge-light", "browser"],
    mainFields: ["browser", "module", "main"],
    define: { "process.env.NODE_ENV": '"production"' },
    minify: true,
    logLevel: "silent",
  });
  const code = result.outputFiles[0].text;
  bundleBytes = code.length;
  vm = new EdgeVM();
  vm.evaluate(code);
}, 60000);

describe("edge runtime", () => {
  it("really is an edge runtime (no Node, no DOM)", async () => {
    const { text } = await call("/env", "x");
    const { require: _bundlerShim, ...env } = JSON.parse(text); // esbuild's own `typeof require` shim
    void _bundlerShim;
    expect(env).toEqual({
      process: "undefined", window: "undefined", document: "undefined", buffer: "undefined",
    });
  });

  it("bundles to a reasonable size (renderer + React viewer + KaTeX + callout)", () => {
    expect(bundleBytes).toBeLessThan(900_000);
  });

  for (const name of fixtureNames) {
    it(`headless renderer matches the golden: ${name}`, async () => {
      const { status, text } = await call("/render", readFixture(name));
      expect(status).toBe(200);
      expect(text).toBe(goldenFor(name, "html"));
    });
  }

  it("React viewer streams the same document (renderToReadableStream)", async () => {
    // The stream output differs from static markup only by React's streaming
    // markers, which are absent for fully-ready content.
    const { text } = await call("/render-react", readFixture("headings-quote"));
    expect(text).toBe(goldenFor("headings-quote", "react.html"));
  });

  it("sanitizes hostile documents", async () => {
    for (const [name, state] of Object.entries(hostile)) {
      const { text } = await call("/render", state);
      expect(text, name).not.toMatch(/<script/i);
      expect(text.replace(/"[^"]*"/g, '""'), name).not.toMatch(/<[^>]+\son\w+\s*=/i);
      expect(text, name).not.toMatch(/href="\s*javascript:/i);
    }
  });

  it("maps invalid input to a 400", async () => {
    const { status } = await call("/render", "{{{");
    expect(status).toBe(400);
  });
});
