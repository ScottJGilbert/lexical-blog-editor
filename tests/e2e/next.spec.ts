/**
 * Next.js (App Router, webpack) consuming the published package output:
 * a React Server Component viewer, SSR + hydration of the client editor, and
 * the headless renderer in both the Node and Edge runtimes.
 */
import { expect, test, type Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fixtureNames, readFixture } from "../helpers/fixtures";
import { goldenFor } from "../helpers/golden";
import { hostile } from "../helpers/hostile";

/** Same normalization the unit tests use, executed inside the page's DOM. */
async function normalizedInPage(page: Page, html: string): Promise<string> {
  return page.evaluate((markup) => {
    const doc = new DOMParser().parseFromString(`<body>${markup}</body>`, "text/html");
    // React needs a host element to inject raw (KaTeX) markup; unwrap it for comparison.
    doc.querySelectorAll('span[style*="display:contents"], span[style*="display: contents"]').forEach((el) => el.replaceWith(...Array.from(el.childNodes)));
    const walk = (node: Node): string => {
      if (node.nodeType === 3) return node.textContent ?? "";
      if (node.nodeType !== 1) return "";
      const el = node as Element;
      const attrs = Array.from(el.attributes)
        .map((a) => {
          let v = a.value;
          if (a.name === "style") v = v.split(";").map((s) => s.trim()).filter(Boolean).map((d) => d.replace(/\s*:\s*/, ": ")).sort().join("; ");
          if (a.name === "class") v = v.split(/\s+/).filter(Boolean).sort().join(" ");
          return `${a.name}=${JSON.stringify(v)}`;
        })
        .sort();
      return `<${el.tagName.toLowerCase()}${attrs.length ? " " + attrs.join(" ") : ""}>${Array.from(el.childNodes).map(walk).join("")}</${el.tagName.toLowerCase()}>`;
    };
    doc.body.normalize();
    return Array.from(doc.body.childNodes).map(walk).join("");
  }, html);
}

test.describe("React Server Component viewer", () => {
  for (const name of fixtureNames) {
    test(`server-renders ${name} identically to the headless renderer (JS disabled)`, async ({ browser }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      await page.goto(`/rsc/${name}`);
      const actual = await page.locator("#post > div").innerHTML();
      // Compare with JS enabled in a scratch page (normalization needs a DOM).
      const scratch = await (await browser.newContext()).newPage();
      await scratch.goto("about:blank");
      expect(await normalizedInPage(scratch, actual)).toBe(await normalizedInPage(scratch, goldenFor(name, "html")));
      await context.close();
    });
  }

  /** Fetches every script a page loads and returns their sizes and bodies. */
  async function scriptsOf(page: Page, path: string) {
    const scripts: { url: string; bytes: number; body: string }[] = [];
    page.on("response", async (res) => {
      if (res.request().resourceType() === "script") {
        const body = await res.text().catch(() => "");
        scripts.push({ url: res.url(), bytes: body.length, body });
      }
    });
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    return scripts;
  }

  test("ships no editor code to the browser (tree-shaking holds under Next)", async ({ page, browser }, testInfo) => {
    // Dev servers ship unminified runtimes, HMR clients and source-derived names.
    const dev = testInfo.project.metadata.mode === "dev";
    const scripts = await scriptsOf(page, "/rsc/headings-quote");
    expect(scripts.length).toBeGreaterThan(0); // Next's own runtime
    for (const s of scripts) {
      expect(s.body, s.url).not.toContain("registerUpdateListener"); // Lexical core
      expect(s.body, s.url).not.toContain("LexicalComposer");
      if (!dev) expect(s.body, s.url).not.toContain("katex");
    }
    if (dev) return;
    // The budget is relative: Next's own runtime differs between majors, and the
    // viewer page must cost (almost) nothing on top of a page that ignores the package.
    const baseline = await scriptsOf(await (await browser.newContext()).newPage(), "/baseline");
    const sum = (list: { bytes: number }[]) => list.reduce((n, s) => n + s.bytes, 0);
    expect(sum(scripts) - sum(baseline)).toBeLessThan(2_000);
  });

  test("extensions render on the server (callout, KaTeX)", async ({ page }) => {
    await page.goto("/rsc/equation");
    await expect(page.locator("#post .katex").first()).toBeVisible();
  });
});

test.describe("client editor under SSR", () => {
  test("the server sends a placeholder, then the editor mounts and works", async ({ page, request }) => {
    const html = await (await request.get("/client")).text();
    expect(html).toContain("Loading editor...");
    expect(html).not.toContain("contenteditable");

    const problems: string[] = [];
    page.on("console", (m) => (m.type() === "error" || m.type() === "warning") && problems.push(m.text()));
    page.on("pageerror", (e) => problems.push(String(e)));
    await page.goto("/client");
    await expect(page.locator(".ContentEditable__root")).toBeVisible();
    await page.locator(".ContentEditable__root").click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type("Typed under Next");
    await expect(page.locator("#live")).toContainText("Typed under Next");
    expect(problems.filter((p) => /hydrat|did not match|Warning:|Minified React error/i.test(p))).toEqual([]);
  });

  test("the callout extension works under Next", async ({ page }) => {
    await page.goto("/client");
    await page.locator(".ContentEditable__root").click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.press("Backspace");
    await page.keyboard.type("/tip");
    await page.locator(".component-picker-menu .item", { hasText: "Tip Callout" }).click();
    await page.keyboard.type("Next callout");
    await expect(page.locator("#live aside.Callout--tip")).toContainText("Next callout");
  });
});

for (const [route, runtime] of [["/api/render", "node"], ["/api/edge", "edge"]] as const) {
  test.describe(`${route} (${runtime} runtime)`, () => {
    test.beforeEach(({}, testInfo) => {
      test.skip(runtime === "edge" && testInfo.project.metadata.edge === false, "this host has no Edge runtime");
    });
    const post = (request: any, state: unknown) => request.post(route, { data: { state } });

    test("renders every fixture exactly like the golden output", async ({ request }) => {
      for (const name of fixtureNames) {
        const res = await post(request, readFixture(name));
        expect(res.status(), name).toBe(200);
        expect(res.headers()["x-runtime"]).toBe(runtime);
        expect(await res.text(), name).toBe(goldenFor(name, "html"));
      }
    });

    test("sanitizes hostile documents", async ({ request }) => {
      for (const [name, state] of Object.entries(hostile)) {
        const html = await (await post(request, state)).text();
        expect(html, name).not.toMatch(/<script/i);
        expect(html.replace(/"[^"]*"/g, '""'), name).not.toMatch(/<[^>]+\son\w+\s*=/i);
        expect(html, name).not.toMatch(/href="\s*javascript:/i);
      }
    });

    test("invalid state is a 400", async ({ request }) => {
      const res = await post(request, "{{{");
      expect(res.status()).toBe(400);
    });
  });
}

test.describe("deployment size (Cloudflare Workers)", () => {
  test("the deployable worker fits its size budget", async ({}, testInfo) => {
    const limit = testInfo.project.metadata.maxWorkerGzipKiB as number | undefined;
    test.skip(limit === undefined, "only measured for the OpenNext/Cloudflare targets");
    const file = join(__dirname, "..", "..", "e2e", "apps", "next-cloudflare", ".open-next", "size.json");
    expect(existsSync(file), "run `pnpm run cf:build` first").toBe(true);
    const size = JSON.parse(readFileSync(file, "utf8"));
    console.info(`worker upload (${size.variant}): ${size.rawKiB} KiB raw, ${size.gzipKiB} KiB gzip; budget ${limit} KiB gzip`);
    expect(size.gzipKiB).toBeLessThan(limit!);
  });
});
