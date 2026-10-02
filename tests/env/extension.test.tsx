/**
 * An extension shipped as a separate npm package works in every runtime:
 * its render half plugs into the headless renderer and the React viewer.
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderToHtml } from "@scottjgilbert/lexical-blog-editor/render";
import { Viewer } from "@scottjgilbert/lexical-blog-editor/react";
import { calloutRender } from "@scottjgilbert/lexical-blog-editor-ext-callout/render";

const text = (t: string) => ({ type: "text", version: 1, text: t, format: 0, style: "", mode: "normal", detail: 0 });
const para = (t: string) => ({ type: "paragraph", version: 1, children: [text(t)], format: "", indent: 0, direction: null });
const state = (kind: unknown) =>
  JSON.stringify({
    root: {
      type: "root", version: 1, format: "", indent: 0, direction: null,
      children: [{ type: "callout", version: 1, kind, children: [para("Careful!")], format: "", indent: 0, direction: null }],
    },
  });

describe("callout extension (separate package)", () => {
  it("renders through the headless renderer", () => {
    expect(renderToHtml(state("warning"), { extensions: [calloutRender] })).toBe(
      '<aside class="Callout Callout--warning" data-callout="warning" role="note"><p class="ViewerTheme__paragraph"><span style="white-space: pre-wrap">Careful!</span></p></aside>',
    );
  });
  it("renders through the React viewer", () => {
    const html = renderToStaticMarkup(createElement(Viewer, { state: state("tip"), extensions: [calloutRender] }));
    expect(html).toContain('<aside class="Callout Callout--tip" data-callout="tip" role="note">');
  });
  it("falls back to `info` for unknown kinds (no class injection)", () => {
    const html = renderToHtml(state('x" onmouseover="alert(1)'), { extensions: [calloutRender] });
    expect(html).toContain("Callout--info");
    expect(html).not.toContain("onmouseover");
  });
  it("without the extension the node degrades to its children", () => {
    const html = renderToHtml(state("info"));
    expect(html).not.toContain("<aside");
    expect(html).toContain("Careful!");
  });
});
