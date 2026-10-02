import { describe, expect, it, vi } from "vitest";
import {
  InvalidEditorStateError,
  RenderLimitError,
  createRenderer,
  defineRenderExtension,
  h,
  parseEditorState,
  renderToHtml,
  renderToTree,
  resolveRenderExtensions,
} from "@blog/render";

const text = (t: string, format = 0) => ({ type: "text", version: 1, text: t, format, style: "", mode: "normal", detail: 0 });
const para = (...children: unknown[]) => ({ type: "paragraph", version: 1, children, format: "", indent: 0, direction: null });
const doc = (...children: unknown[]) => ({ root: { type: "root", version: 1, children, format: "", indent: 0, direction: null } });

describe("input handling", () => {
  it("rejects invalid JSON", () => {
    expect(() => renderToHtml("{nope")).toThrow(InvalidEditorStateError);
  });
  it.each([
    ["null", "null"],
    ["array", "[]"],
    ["number", "1"],
    ["no root", "{}"],
    ["root wrong type", '{"root":{"type":"paragraph","children":[]}}'],
    ["root without children", '{"root":{"type":"root"}}'],
  ])("rejects %s", (_n, input) => {
    expect(() => renderToHtml(input)).toThrow(InvalidEditorStateError);
  });
  it("accepts the `{ editorState }` wrapper", () => {
    expect(renderToHtml({ editorState: doc(para(text("a"))) } as any)).toContain(">a<");
  });
  it("accepts an EditorState-like object", () => {
    expect(renderToHtml({ toJSON: () => doc(para(text("a"))) })).toContain(">a<");
  });
  it("parseEditorState returns the object unchanged", () => {
    const state = doc();
    expect(parseEditorState(state)).toBe(state);
  });
  it("renders an empty document to an empty string", () => {
    expect(renderToHtml(doc())).toBe("");
  });
  it("tolerates malformed children and non-string text", () => {
    const warn = vi.fn();
    const html = renderToHtml(doc(para(null, 42, { type: "text", text: 7 }, text("ok"))), { onWarning: warn });
    expect(html).toContain("ok");
    expect(warn).toHaveBeenCalled();
  });
});

describe("limits", () => {
  const deep = (n: number): unknown => (n === 0 ? text("x") : { type: "quote", children: [deep(n - 1)] });
  it("throws RenderLimitError past maxDepth", () => {
    expect(() => renderToHtml(doc(deep(50)), { limits: { maxDepth: 20 } })).toThrow(RenderLimitError);
  });
  it("survives pathological nesting by default instead of overflowing the stack", () => {
    expect(() => renderToHtml(doc(deep(5000)))).toThrow(RenderLimitError);
  });
  it("throws RenderLimitError past maxNodes", () => {
    const many = Array.from({ length: 100 }, () => para(text("a")));
    expect(() => renderToHtml(doc(...many), { limits: { maxNodes: 50 } })).toThrow(RenderLimitError);
  });
  it("limits apply across nested caption states", () => {
    const image = (caption: unknown) => ({ type: "image", src: "https://x.test/a.png", altText: "", showCaption: true, caption: { editorState: caption } });
    let state: unknown = doc(para(text("end")));
    for (let i = 0; i < 400; i++) state = doc(para(image(state)));
    expect(() => renderToHtml(state as any)).toThrow(RenderLimitError);
  });
});

describe("unknown nodes", () => {
  it("warns and renders children of unknown containers", () => {
    const warn = vi.fn();
    const html = renderToHtml(doc({ type: "mystery", children: [para(text("inside"))] }), { onWarning: warn });
    expect(html).toContain("inside");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("mystery"), expect.anything());
  });
  it("skips unknown leaves", () => {
    expect(renderToHtml(doc({ type: "mystery" }, para(text("a"))))).toBe(renderToHtml(doc(para(text("a")))));
  });
  it("is not fooled by Object.prototype names", () => {
    for (const type of ["constructor", "__proto__", "toString", "hasOwnProperty"]) {
      expect(() => renderToHtml(doc({ type, children: [text("x")] }))).not.toThrow();
    }
  });
  it("a throwing renderer is isolated to its own node", () => {
    const warn = vi.fn();
    const boom = defineRenderExtension({ name: "boom", nodes: { boom: () => { throw new Error("kaboom"); } } });
    const html = renderToHtml(doc({ type: "boom" }, para(text("still here"))), { extensions: [boom], onWarning: warn });
    expect(html).toContain("still here");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("kaboom"), expect.anything());
  });
});

describe("theme", () => {
  it("overrides class names deeply", () => {
    const html = renderToHtml(doc(para(text("a", 1))), { theme: { paragraph: "my-p", text: { bold: "my-bold" } } });
    expect(html).toContain('class="my-p"');
    expect(html).toContain('class="my-bold"');
    expect(html).not.toContain("ViewerTheme__paragraph");
  });
  it("keeps other default classes when overriding one", () => {
    const html = renderToHtml(doc({ type: "heading", tag: "h1", children: [text("t")] }, { type: "heading", tag: "h2", children: [text("u")] }), {
      theme: { heading: { h1: "big" } },
    });
    expect(html).toContain('<h1 class="big"');
    expect(html).toContain('<h2 class="ViewerTheme__h2"');
  });
});

describe("render extensions", () => {
  const callout = defineRenderExtension({
    name: "callout",
    nodes: { callout: (node, ctx) => h("aside", { class: "callout", "data-kind": String(node.kind) }, ctx.renderChildren(node)) },
    theme: { callout: "themed-callout" } as any,
  });

  it("renders custom node types", () => {
    const html = renderToHtml(doc({ type: "callout", kind: "tip", children: [para(text("hello"))] }), { extensions: [callout] });
    expect(html).toContain('<aside class="callout" data-kind="tip">');
    expect(html).toContain("hello");
  });
  it("later extensions override earlier ones and the built-ins", () => {
    const shout = defineRenderExtension({ name: "shout", nodes: { paragraph: (n, ctx) => h("p", { class: "shout" }, ctx.renderChildren(n)) } });
    expect(renderToHtml(doc(para(text("a"))), { extensions: [shout] })).toContain('<p class="shout">');
  });
  it("same-name extensions: the last one wins", () => {
    const a = defineRenderExtension({ name: "x", nodes: { t: () => h("i", null, "a") } });
    const b = defineRenderExtension({ name: "x", nodes: { t: () => h("i", null, "b") } });
    expect(renderToHtml(doc({ type: "t" }), { extensions: [a, b] })).toBe("<i>b</i>");
  });
  it("installs dependencies first and tolerates cycles", () => {
    const dep = defineRenderExtension({ name: "dep", nodes: { t: () => h("i", null, "dep") } });
    const top = defineRenderExtension({ name: "top", dependencies: [dep], nodes: { t: () => h("i", null, "top") } });
    expect(resolveRenderExtensions([top]).map((e) => e.name)).toEqual(["dep", "top"]);
    const a: any = { name: "a", dependencies: [] };
    const b: any = { name: "b", dependencies: [a] };
    a.dependencies.push(b);
    expect(() => resolveRenderExtensions([a])).not.toThrow();
  });
  it("extension output is sanitized like everything else", () => {
    const evil = defineRenderExtension({ name: "evil", nodes: { evil: () => h("div", { onclick: "x()" }, [h("script", null, "x"), h("a", { href: "javascript:x" }, "l")]) } });
    const html = renderToHtml(doc({ type: "evil" }), { extensions: [evil] });
    expect(html).toBe("<div><a>l</a></div>");
  });
  it("extensions can widen the sanitize policy", () => {
    const ext = defineRenderExtension({
      name: "maps",
      nodes: { map: () => h("iframe", { src: "https://maps.example.com/embed/1" }) },
      sanitize: { iframeAllowlist: ["https://maps.example.com/embed/"] },
    });
    expect(renderToHtml(doc({ type: "map" }), { extensions: [ext] })).toContain("<iframe");
    expect(renderToHtml(doc({ type: "map" }), { extensions: [ext], sanitize: true })).toContain("<iframe");
  });
  it("extensions can add theme keys", () => {
    const ext = defineRenderExtension({
      name: "t",
      theme: { callout: "from-ext" } as any,
      nodes: { c: (_n, ctx) => h("div", { class: String((ctx.theme as any).callout) }) },
    });
    expect(renderToHtml(doc({ type: "c" }), { extensions: [ext] })).toBe('<div class="from-ext"></div>');
  });
});

describe("sanitize: false", () => {
  const evil = doc(para({ type: "link", url: "javascript:alert(1)", children: [text("x")] }));
  it("is on by default", () => {
    expect(renderToHtml(evil)).not.toContain("javascript:");
  });
  it("can be switched off for trusted content", () => {
    expect(renderToHtml(evil, { sanitize: false })).toContain("javascript:");
  });
});

describe("built-in node details", () => {
  it("renders figure+figcaption for image captions and drops empty captions", () => {
    const withCaption = doc(para({ type: "image", src: "https://x.test/a.png", altText: "a", showCaption: true, caption: { editorState: doc(para(text("cap"))) } }));
    expect(renderToHtml(withCaption)).toContain("<figcaption>");
    const empty = doc(para({ type: "image", src: "https://x.test/a.png", altText: "a", showCaption: true, caption: { editorState: doc() } }));
    expect(renderToHtml(empty)).not.toContain("figure");
  });
  it("skips images with an empty src (unfinished uploads)", () => {
    expect(renderToHtml(doc(para({ type: "image", src: "", altText: "a" })))).not.toContain("<img");
  });
  it("turns a paragraph containing a block into a div", () => {
    const html = renderToHtml(doc(para(text("a"), { type: "layout-container", templateColumns: "1fr", children: [] })));
    expect(html).toContain('role="paragraph"');
  });
  it("datetime is deterministic and overridable", () => {
    const state = doc(para({ type: "datetime", dateTime: "2024-03-05T12:30:00.000Z" }));
    expect(renderToHtml(state)).toContain("Tue Mar 05 2024 12:30");
    expect(renderToHtml(state, { formatDateTime: (d) => d.toISOString().slice(0, 10) })).toContain(">2024-03-05<");
    expect(renderToHtml(doc(para({ type: "datetime", dateTime: "garbage" })))).not.toContain("span");
  });
  it("closed collapsibles do not render `open`", () => {
    const mk = (open: boolean) => renderToHtml(doc({ type: "collapsible-container", open, children: [] }));
    expect(mk(true)).toContain(" open");
    expect(mk(false)).not.toContain(" open");
  });
  it("code blocks get a gutter and escape their content", () => {
    const html = renderToHtml(doc({ type: "code", language: "js", children: [text("a<b>"), { type: "linebreak" }, text("c")] }));
    expect(html).toContain('data-gutter="1\n2"');
    expect(html).toContain("a&lt;b&gt;");
  });
  it("renders video, audio and file nodes", () => {
    const html = renderToHtml(doc(
      { type: "video", src: "https://cdn.test/v.mp4", poster: "https://cdn.test/p.jpg", controls: true },
      { type: "audio", src: "https://cdn.test/a.mp3" },
      { type: "file", src: "https://cdn.test/f.pdf", fileName: "Report.pdf", fileSize: 2048 },
    ));
    expect(html).toContain('<video src="https://cdn.test/v.mp4"');
    expect(html).toContain("<audio");
    expect(html).toContain('download="Report.pdf"');
    expect(html).toContain("(2.0 KB)");
  });
  it("blocks unsafe media urls", () => {
    const html = renderToHtml(doc({ type: "video", src: "javascript:alert(1)" }, { type: "file", src: "javascript:alert(1)", fileName: "x" }));
    expect(html).not.toContain("javascript:");
  });
});

describe("renderToTree", () => {
  it("returns a plain serializable tree", () => {
    const tree = renderToTree(doc(para(text("a"))));
    expect(JSON.parse(JSON.stringify(tree))).toEqual(tree);
    expect(tree[0]).toMatchObject({ type: "element", tag: "p" });
  });
  it("createRenderer exposes its options", () => {
    const r = createRenderer({ sanitize: false });
    expect(r.options.sanitize).toBe(false);
  });
});
