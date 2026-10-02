/**
 * End-to-end over real HTTP: Express servers (ESM and CommonJS) that render
 * saved editor state with the headless renderer and the React viewer.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { join } from "node:path";
import { fixtureNames, readFixture } from "../helpers/fixtures";
import { goldenFor } from "../helpers/golden";
import { hostile } from "../helpers/hostile";

const cwd = join(__dirname, "..", "..", "e2e", "apps", "express-server");

async function start(file: string): Promise<{ base: string; stop: () => void }> {
  const child: ChildProcess = spawn(process.execPath, [file], { cwd, env: { ...process.env, PORT: "0" } });
  const port = await new Promise<number>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${file} did not start`)), 20000);
    child.stdout!.on("data", (chunk) => {
      const match = /LISTENING (\d+)/.exec(String(chunk));
      if (match) {
        clearTimeout(timer);
        resolve(Number(match[1]));
      }
    });
    child.stderr!.on("data", (chunk) => process.stderr.write(chunk));
    child.on("exit", (code) => reject(new Error(`${file} exited early (${code})`)));
  });
  return { base: `http://127.0.0.1:${port}`, stop: () => child.kill() };
}

const post = (base: string, path: string, body: unknown, raw = false) =>
  fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: raw ? (body as string) : JSON.stringify(body),
  });

describe.each([
  ["ESM (app.mjs)", "app.mjs", "esm"],
  ["CommonJS (app.cjs)", "app.cjs", "cjs"],
])("Express %s", (_label, file, runtime) => {
  let server: { base: string; stop: () => void };
  beforeAll(async () => {
    server = await start(file);
  });
  afterAll(() => server?.stop());

  it("starts and reports its module system", async () => {
    const res = await fetch(`${server.base}/health`);
    expect(await res.json()).toEqual({ ok: true, runtime });
  });

  for (const name of fixtureNames) {
    it(`POST /render returns the golden HTML: ${name}`, async () => {
      const res = await post(server.base, "/render", { state: readFixture(name) });
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/html");
      expect(await res.text()).toBe(goldenFor(name, "html"));
    });
    it(`POST /render-react returns the golden React markup: ${name}`, async () => {
      const res = await post(server.base, "/render-react", { state: readFixture(name) });
      expect(await res.text()).toBe(goldenFor(name, "react.html"));
    });
  }

  it("accepts the state as an object as well as a string", async () => {
    const res = await post(server.base, "/render", { state: JSON.parse(readFixture("headings-quote")) });
    expect(await res.text()).toBe(goldenFor("headings-quote", "html"));
  });

  it("answers invalid editor state with a 400, not a crash", async () => {
    for (const state of ["not json", "{}", '{"root":{"type":"nope"}}', null, 42]) {
      const res = await post(server.base, "/render", { state });
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe("InvalidEditorStateError");
    }
    const alive = await fetch(`${server.base}/health`);
    expect(alive.status).toBe(200);
  });

  it("sanitizes hostile documents server-side", async () => {
    for (const [name, state] of Object.entries(hostile)) {
      const res = await post(server.base, "/render", { state });
      const html = await res.text();
      expect(html, name).not.toMatch(/<script/i);
      // Blank out quoted attribute values so text *inside* a value can't false-positive.
      const markup = html.replace(/"[^"]*"/g, '""');
      expect(markup, name).not.toMatch(/<[^>]+\son\w+\s*=/i);
      expect(html, name).not.toMatch(/href="\s*javascript:/i);
      expect(html, name).not.toMatch(/src="\s*javascript:/i);
    }
  });

  it("rejects absurdly deep documents with a 400 instead of overflowing the stack", async () => {
    const depth = 3000;
    const state =
      '{"root":{"type":"root","children":[' +
      '{"type":"quote","children":['.repeat(depth) +
      '{"type":"text","text":"x","format":0}' +
      "]}".repeat(depth) +
      "]}}";
    const res = await post(server.base, "/render", { state });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("RenderLimitError");
  });

  it("serves many concurrent renders with identical output", async () => {
    const state = readFixture("text-formats");
    const responses = await Promise.all(Array.from({ length: 100 }, () => post(server.base, "/render", { state }).then((r) => r.text())));
    expect(new Set(responses).size).toBe(1);
    expect(responses[0]).toBe(goldenFor("text-formats", "html"));
  });
});
