/**
 * The same saved Lexical JSON must produce the same output in every runtime.
 *
 * This file runs unchanged under three Vitest projects: plain Node, jsdom
 * (browser-like) and Vercel's edge-runtime VM (no Node built-ins, no DOM). It
 * imports the *built package* by name, exactly like a consumer would.
 *
 * Regenerate goldens (only from the node project) with:
 *   UPDATE_GOLDEN=1 pnpm vitest run --project env-node
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderToHtml, createRenderer } from "@scottjgilbert/lexical-blog-editor/render";
import { katexRenderExtension } from "@scottjgilbert/lexical-blog-editor/render/katex";
import { Viewer } from "@scottjgilbert/lexical-blog-editor/react";
import { fixtureNames, readFixture, FIXTURE_DIR } from "../helpers/fixtures";
import { hostile } from "../helpers/hostile";
import { goldenFor, writeGolden, readHostileGolden, writeHostileGolden } from "../helpers/golden";

const UPDATE = !!process.env.UPDATE_GOLDEN;
const KATEX = new Set(["equation"]);
const options = (name: string) => (KATEX.has(name) ? { extensions: [katexRenderExtension] } : {});

describe(`golden HTML (${typeof window === "undefined" ? "no window" : "window"})`, () => {
  for (const name of fixtureNames) {
    it(`render: ${name}`, () => {
      const html = renderToHtml(readFixture(name), options(name));
      if (UPDATE) writeGolden(name, "html", html);
      expect(html).toBe(goldenFor(name, "html"));
    });

    it(`react (static markup): ${name}`, () => {
      const markup = renderToStaticMarkup(
        createElement(Viewer, { state: readFixture(name), ...options(name) }),
      );
      if (UPDATE) writeGolden(name, "react.html", markup);
      expect(markup).toBe(goldenFor(name, "react.html"));
    });
  }

  it("hostile documents render identically everywhere", () => {
    const out: Record<string, string> = {};
    for (const [name, state] of Object.entries(hostile)) out[name] = renderToHtml(state);
    if (UPDATE) writeHostileGolden(out);
    expect(out).toEqual(readHostileGolden());
  });

  it("a reused renderer is stateless between documents", () => {
    const renderer = createRenderer();
    const first = renderer.renderToHtml(readFixture(fixtureNames[0]));
    for (const name of fixtureNames) renderer.renderToHtml(readFixture(name));
    expect(renderer.renderToHtml(readFixture(fixtureNames[0]))).toBe(first);
  });

  it("accepts string, object and toJSON() inputs equivalently", () => {
    const json = readFixture("text-formats");
    const obj = JSON.parse(json);
    const viaToJson = { toJSON: () => obj };
    const expected = renderToHtml(json);
    expect(renderToHtml(obj)).toBe(expected);
    expect(renderToHtml(viaToJson)).toBe(expected);
  });
});

void FIXTURE_DIR;
