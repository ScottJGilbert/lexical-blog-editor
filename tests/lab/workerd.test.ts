/**
 * The package inside a *real* workerd (the Cloudflare Workers runtime), not a
 * simulation:
 *
 *  1. the worker is bundled by `wrangler deploy --dry-run` in production mode,
 *     exactly as a deploy would, once per compatibility configuration
 *  2. the resulting `worker.js` (the artifact that would be uploaded) is served
 *     by the production `workerd` binary, the same one Cloudflare runs
 *  3. every fixture / hostile document is POSTed over fetch and compared with
 *     the same golden files the Node, jsdom and edge-VM suites use
 *  4. one extra pass goes through `wrangler dev --local` (development bundle,
 *     the developer-machine path) to prove it behaves the same
 *
 * Run it with `pnpm test:lab:workerd`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { gzipSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fixtureNames, readFixture } from "../helpers/fixtures";
import { goldenFor, readHostileGolden } from "../helpers/golden";
import { hostile } from "../helpers/hostile";

const here = dirname(fileURLToPath(import.meta.url));
const appDir = join(here, "..", "..", "e2e", "apps", "workerd-worker");
const { bundle, variants } = (await import(join(appDir, "bundle.mjs"))) as typeof import("../../e2e/apps/workerd-worker/bundle.mjs");

type Variant = keyof typeof variants;
type Target = Variant | "wrangler-dev";
const names = Object.keys(variants) as Variant[];
const targets: Target[] = [...names, "wrangler-dev"];
const bundles = {} as Record<Variant, string>;
const servers = {} as Record<Target, { base: string; child: ChildProcess }>;
const workerdBinary: string = createRequire(import.meta.url)("workerd").default;

async function raw(variant: Target, path: string, init?: RequestInit) {
  return fetch(`${servers[variant].base}${path}`, init);
}

async function call(variant: Target, path: string, state: unknown, method = "POST") {
  const res = await raw(variant, path, {
    method,
    body: method === "POST" ? JSON.stringify({ state }) : undefined,
  });
  return { status: res.status, text: await res.text(), headers: res.headers };
}

/** Ask the OS for a free TCP port. */
const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address() as { port: number };
      probe.close(() => resolve(port));
    });
  });

const spawned: ChildProcess[] = [];
const track = (child: ChildProcess) => (spawned.push(child), child);

/** Kill a spawned process *and its children* (wrangler leaves workerd behind otherwise). */
const killTree = (child: ChildProcess) => {
  try {
    process.kill(-child.pid!, "SIGKILL");
  } catch {
    /* already gone */
  }
};

function waitUntilServing(label: string, port: number, child: ChildProcess): Promise<{ base: string; child: ChildProcess }> {
  return new Promise((resolve, reject) => {
    let log = "";
    child.stdout!.on("data", (c) => (log += c));
    child.stderr!.on("data", (c) => (log += c));
    child.on("exit", (code) => reject(new Error(`${label} exited with ${code}\n${log}`)));
    const base = `http://127.0.0.1:${port}`;
    const deadline = Date.now() + 120_000;
    const poll = async () => {
      try {
        if ((await fetch(`${base}/env`)).ok) return resolve({ base, child });
      } catch {
        /* not listening yet */
      }
      if (Date.now() > deadline) return reject(new Error(`${label} did not start:\n${log}`));
      setTimeout(poll, 300);
    };
    poll();
  });
}

/** Serve the *deployable artifact* (dist/<variant>/worker.js) with the bare workerd binary. */
async function startWorkerd(variant: Variant) {
  const port = await freePort();
  const { flags, date } = variants[variant];
  const config = join(appDir, "dist", variant, "config.capnp");
  writeFileSync(
    config,
    `using Workerd = import "/workerd/workerd.capnp";
const config :Workerd.Config = (
  services = [(name = "main", worker = (
    modules = [(name = "worker.js", esModule = embed "worker.js")],
    compatibilityDate = "${date}",
    compatibilityFlags = [${flags.map((f) => `"${f}"`).join(", ")}],
  ))],
  sockets = [(name = "http", address = "127.0.0.1:${port}", http = (), service = "main")],
);
`,
  );
  const child = track(spawn(workerdBinary, ["serve", "--verbose", config], { cwd: join(appDir, "dist", variant), detached: true }));
  return waitUntilServing(`workerd (${variant})`, port, child);
}

/** `wrangler dev --local`: bundles in development mode and runs workerd, like `npm run dev` would. */
async function startWranglerDev() {
  const port = await freePort();
  const child = track(spawn(
    process.execPath,
    [
      join(appDir, "../../../node_modules/wrangler/bin/wrangler.js"),
      "dev", "--local", "--ip", "127.0.0.1", "--port", String(port), "--inspector-port", String(await freePort()),
      "--compatibility-date", variants.plain.date,
    ],
    { cwd: appDir, detached: true, env: { ...process.env, NODE_ENV: "development", WRANGLER_SEND_METRICS: "false", CI: "1", NO_COLOR: "1" } },
  ));
  return waitUntilServing("wrangler dev", port, child);
}

/** React streams add `<!-- -->` separators and may hoist preload links; they are not content. */
const normalizeStream = (html: string) =>
  html.replace(/<!-- -->/g, "").replace(/<link rel="preload"[^>]*>/g, "");
const normalizeGolden = normalizeStream;

beforeAll(async () => {
  bundle(names);
  for (const name of names) bundles[name] = readFileSync(join(appDir, "dist", name, "worker.js"), "utf8");
  const started = await Promise.all([
    ...names.map((name) => startWorkerd(name)),
    startWranglerDev(),
  ]);
  targets.forEach((name, i) => (servers[name] = started[i]));
}, 240_000);

afterAll(() => {
  spawned.forEach(killTree);
});

describe.each(targets)("workerd (%s)", (variant) => {
  it("is genuinely workerd: Workers user agent, no DOM, no eval", async () => {
    const { text } = await call(variant, "/env", null, "GET");
    const env = JSON.parse(text);
    expect(env.navigator).toBe("Cloudflare-Workers");
    expect(env.window).toBe("undefined");
    expect(env.document).toBe("undefined");
    // workerd refuses code generation from strings; the package must never need it.
    expect(env.codegen).toBe(false);
    if (variant !== "nodejs-compat") {
      expect(env.process).toBe("undefined");
      expect(env.buffer).toBe("undefined");
    }
  });

  it("exposes the same public API as in Node", async () => {
    const env = JSON.parse((await call(variant, "/env", null, "GET")).text);
    const keys = async (spec: string) => Object.keys(await import(/* @vite-ignore */ spec)).sort();
    expect(env.entries.root).toEqual(await keys("@scottjgilbert/lexical-blog-editor"));
    expect(env.entries.render).toEqual(await keys("@scottjgilbert/lexical-blog-editor/render"));
    expect(env.entries.react).toEqual(await keys("@scottjgilbert/lexical-blog-editor/react"));
    expect(env.entries.html).toEqual(await keys("@scottjgilbert/lexical-blog-editor/html"));
  });

  for (const name of fixtureNames) {
    it(`headless renderer matches the golden: ${name}`, async () => {
      const { status, text } = await call(variant, "/render", readFixture(name));
      expect(status).toBe(200);
      expect(text).toBe(goldenFor(name, "html"));
    });

    it(`React viewer (renderToReadableStream) matches: ${name}`, async () => {
      const { status, text } = await call(variant, "/render-react", readFixture(name));
      expect(status).toBe(200);
      expect(normalizeStream(text)).toBe(normalizeGolden(goldenFor(name, "react.html")));
    });
  }

  it("hostile documents render byte-identically to the golden output", async () => {
    const golden = readHostileGolden();
    for (const [name, state] of Object.entries(hostile)) {
      const { status, text } = await call(variant, "/render-fresh", state);
      expect(status, name).toBe(200);
      expect(text, name).toBe(golden[name]);
      expect(text, name).not.toMatch(/<script/i);
      expect(text.replace(/"[^"]*"/g, '""'), name).not.toMatch(/<[^>]+\son\w+\s*=/i);
      expect(text, name).not.toMatch(/(href|src)="\s*javascript:/i);
    }
  });

  it("answers 400 for malformed input, 413 for documents over the limits", async () => {
    expect((await call(variant, "/render", "{{{")).status).toBe(400);
    expect((await raw(variant, "/render", { method: "POST", body: "not json" })).status).toBe(400);
    const depth = 3000;
    const deep =
      '{"root":{"type":"root","children":[' +
      '{"type":"quote","children":['.repeat(depth) +
      '{"type":"text","text":"x","format":0}' +
      "]}".repeat(depth) +
      "]}}";
    expect((await call(variant, "/render", deep)).status).toBe(413);
  });

  it("renders a document just inside the depth limit without exhausting workerd's stack", async () => {
    const depth = 250;
    const deep =
      '{"root":{"type":"root","children":[' +
      '{"type":"quote","children":['.repeat(depth) +
      '{"type":"text","text":"x","format":0}' +
      "]}".repeat(depth) +
      "]}}";
    const { status, text } = await call(variant, "/render", deep);
    expect(status).toBe(200);
    expect(text.match(/<blockquote/g)).toHaveLength(depth);
  });

  it("serves 80 concurrent mixed requests in one isolate with no cross-request leakage", async () => {
    const jobs = Array.from({ length: 80 }, (_, i) => {
      const name = fixtureNames[i % fixtureNames.length];
      return call(variant, "/render", readFixture(name)).then((r) => ({ name, ...r }));
    });
    for (const r of await Promise.all(jobs)) {
      expect(r.status).toBe(200);
      expect(r.text, r.name).toBe(goldenFor(r.name, "html"));
    }
  });

  it("is deterministic across repeated requests (no mutable module state)", async () => {
    const state = readFixture("lists");
    const outputs = new Set<string>();
    for (let i = 0; i < 25; i++) outputs.add((await call(variant, "/render", state)).text);
    expect(outputs.size).toBe(1);
  });

  it("renders a ~1 MB, 2000-paragraph document quickly", async () => {
    const paragraph = (i: number) => ({
      type: "paragraph", version: 1, format: "", indent: 0, direction: null,
      children: [{ type: "text", version: 1, text: `Paragraph ${i} ` + "lorem ipsum dolor sit amet ".repeat(18), format: i % 4, style: "", mode: "normal", detail: 0 }],
    });
    const state = { root: { type: "root", version: 1, format: "", indent: 0, direction: null, children: Array.from({ length: 2000 }, (_, i) => paragraph(i)) } };
    const { status, text } = await call(variant, "/render-timed", state);
    expect(status).toBe(200);
    const { bytes, ms } = JSON.parse(text);
    expect(bytes).toBeGreaterThan(900_000);
    // Miniflare enforces no CPU limit; this guards against accidental O(n^2).
    expect(ms).toBeLessThan(3000);
    console.info(`workerd (${variant}): rendered ${(bytes / 1024).toFixed(0)} KiB in ${ms} ms`);
  });
});

describe("workerd deployment fit", () => {
  it.each(names)("the %s bundle fits the Workers size limits with headroom", (variant) => {
    const size = Buffer.byteLength(bundles[variant]);
    const gz = gzipSync(bundles[variant]).length;
    console.info(`workerd (${variant}): ${(size / 1024).toFixed(0)} KiB raw, ${(gz / 1024).toFixed(0)} KiB gzip`);
    expect(gz).toBeLessThan(1024 * 1024); // free plan allows 3 MiB gzip; keep a wide margin
  });

  it("bundles nothing Node-only into the plain worker (no unenv polyfills, no jsdom, no dompurify)", () => {
    for (const forbidden of ["unenv", "jsdom", "dompurify", "node:fs", "node:path"]) {
      expect(bundles.plain, forbidden).not.toContain(forbidden);
    }
  });

  it("plain and nodejs_compat builds render identically", async () => {
    for (const name of fixtureNames) {
      const a = (await call("plain", "/render", readFixture(name))).text;
      const b = (await call("nodejs-compat", "/render", readFixture(name))).text;
      expect(b, name).toBe(a);
    }
  });
});
