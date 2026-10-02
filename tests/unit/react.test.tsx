import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Viewer, hnodesToReact, renderToReact, styleToObject, toReactProps, createRenderer } from "@blog/react";
import { h, defineRenderExtension } from "@blog/core";

const text = (t: string, format = 0) => ({ type: "text", version: 1, text: t, format, style: "", mode: "normal", detail: 0 });
const para = (...children: unknown[]) => ({ type: "paragraph", version: 1, children, format: "", indent: 0, direction: null });
const doc = (...children: unknown[]) => JSON.stringify({ root: { type: "root", version: 1, children, format: "", indent: 0, direction: null } });
const render = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

describe("<Viewer>", () => {
  it("renders into a wrapper div", () => {
    expect(render(createElement(Viewer, { state: doc(para(text("hi"))) }))).toBe(
      '<div><p class="ViewerTheme__paragraph"><span style="white-space:pre-wrap">hi</span></p></div>',
    );
  });
  it("supports className and `as`", () => {
    const html = render(createElement(Viewer, { state: doc(), className: "post", as: "article" }));
    expect(html).toBe('<article class="post"></article>');
  });
  it("sanitizes by default", () => {
    const html = render(createElement(Viewer, { state: doc(para({ type: "link", url: "javascript:alert(1)", children: [text("x")] })) }));
    expect(html).not.toContain("javascript:");
  });
  it("sanitize={false} opts out", () => {
    const html = render(createElement(Viewer, { state: doc(para({ type: "link", url: "javascript:alert(1)", children: [text("x")] })), sanitize: false }));
    expect(html).toContain("javascript:");
  });
  it("shows an error element for invalid state and reports it", () => {
    const onError = vi.fn();
    const html = render(createElement(Viewer, { state: "not json", onError }));
    expect(html).toContain("LexicalBlogViewer__Error");
    expect(onError).toHaveBeenCalledOnce();
  });
  it("renders a custom fallback", () => {
    expect(render(createElement(Viewer, { state: "{}", fallback: createElement("em", null, "oops") }))).toContain("<em>oops</em>");
  });
  it("accepts a prebuilt renderer", () => {
    const renderer = createRenderer({ theme: { paragraph: "from-renderer" } });
    expect(render(createElement(Viewer, { state: doc(para(text("a"))), renderer }))).toContain("from-renderer");
  });
  it("renders extension nodes", () => {
    const ext = defineRenderExtension({ name: "c", nodes: { callout: (n, ctx) => h("aside", null, ctx.renderChildren(n)) } });
    const html = render(createElement(Viewer, { state: doc({ type: "callout", children: [para(text("x"))] }), extensions: [ext] }));
    expect(html).toContain("<aside>");
  });
  it("`replace` swaps elements for components (e.g. react-tweet)", () => {
    const html = render(
      createElement(Viewer, {
        state: doc({ type: "tweet", id: "42", format: "" }),
        replace: (el) =>
          el.props["data-lexical-tweet-id"] ? createElement("div", { id: "tweet-component" }, `tweet ${el.props["data-lexical-tweet-id"]}`) : undefined,
      }),
    );
    expect(html).toContain("tweet 42");
    expect(html).not.toContain("x.com/i/web/status");
  });
  it("`replace` can render children via helpers", () => {
    const html = render(
      createElement(Viewer, {
        state: doc(para(text("inner"))),
        replace: (el, { render }) => (el.tag === "p" ? createElement("section", null, render(el.children)) : undefined),
      }),
    );
    expect(html).toContain("<section>");
    expect(html).toContain("inner");
  });
});

describe("conversion helpers", () => {
  it("maps HTML attribute names to React props", () => {
    expect(toReactProps({ class: "a", colspan: 2, frameborder: "0", allowfullscreen: true, tabindex: -1, "data-x": "1", "aria-hidden": "true" })).toEqual({
      className: "a", colSpan: 2, frameBorder: "0", allowFullScreen: true, tabIndex: -1, "data-x": "1", "aria-hidden": "true",
    });
  });
  it("drops empty values", () => {
    expect(toReactProps({ a: undefined, b: null, c: false })).toEqual({});
  });
  it("parses style strings", () => {
    expect(styleToObject("font-size: 12px; background-color: red; --x: 1")).toEqual({ fontSize: "12px", backgroundColor: "red", "--x": "1" });
  });
  it("renders raw nodes with dangerouslySetInnerHTML in a contents wrapper", () => {
    const html = render(createElement("div", null, hnodesToReact([{ type: "raw", html: "<b>x</b>" }])));
    expect(html).toBe('<div><span style="display:contents"><b>x</b></span></div>');
  });
  it("renderToReact returns nodes without a wrapper", () => {
    expect(render(createElement("div", null, renderToReact(doc(para(text("a"))))))).toContain("<p");
  });
  it("renders void elements without children", () => {
    expect(render(createElement("div", null, hnodesToReact([h("br"), h("hr"), h("img", { src: "https://x.test/a.png", alt: "", loading: "lazy" })])))).toBe(
      '<div><br/><hr/><img src="https://x.test/a.png" alt="" loading="lazy"/></div>',
    );
  });
});
