import { describe, expect, it } from "vitest";
import { h, isSafeUrl, resolvePolicy, sanitizeStyle, sanitizeTree, text, mergePolicies } from "@blog/core";
import { serializeToHtml } from "@blog/render";

const clean = (node: ReturnType<typeof h>, policy = {}) =>
  serializeToHtml(sanitizeTree([node], resolvePolicy(policy)));

describe("isSafeUrl", () => {
  it.each([
    ["https://example.com/a?b=1", true],
    ["http://example.com", true],
    ["mailto:a@b.co", true],
    ["tel:+123", true],
    ["/relative", true],
    ["relative/path", true],
    ["#fragment", true],
    ["//cdn.example.com/x.png", true],
    ["", true],
    ["javascript:alert(1)", false],
    ["JAVASCRIPT:alert(1)", false],
    ["  javascript:alert(1)", false],
    ["java\tscript:alert(1)", false],
    ["java\nscript:alert(1)", false],
    ["jav&#x09;ascript:alert(1)", true], // entity text is inert once escaped on output
    ["vbscript:x", false],
    ["data:text/html;base64,PHNjcmlwdD4=", false],
    ["file:///etc/passwd", false],
    ["blob:https://x/y", false],
    ["ftp://example.com", false],
  ])("%j -> %s", (url, expected) => {
    expect(isSafeUrl(url)).toBe(expected);
  });

  it("allows raster data URIs only when asked", () => {
    expect(isSafeUrl("data:image/png;base64,AAAA")).toBe(false);
    expect(isSafeUrl("data:image/png;base64,AAAA", undefined, true)).toBe(true);
    expect(isSafeUrl("data:text/html,<b>", undefined, true)).toBe(false);
    expect(isSafeUrl("data:application/javascript,alert(1)", undefined, true)).toBe(false);
  });

  it("honors extra schemes", () => {
    expect(isSafeUrl("sms:123")).toBe(false);
    expect(isSafeUrl("sms:123", new Set(["sms"]))).toBe(true);
  });
});

describe("sanitizeStyle", () => {
  const policy = resolvePolicy();
  it("keeps allowed properties and drops the rest", () => {
    expect(sanitizeStyle("color: red; position: fixed; font-size: 12px", policy)).toBe("color: red; font-size: 12px");
  });
  it.each([
    "background-color: url(javascript:alert(1))",
    "color: expression(alert(1))",
    "color: red /* x */",
    "font-family: \\61 bc",
    "color: var(--x)",
    "width: calc(1px) <b>",
  ])("rejects unsafe value %j", (decl) => {
    expect(sanitizeStyle(decl, policy)).toBe("");
  });
  it("restricts display values", () => {
    expect(sanitizeStyle("display: grid", policy)).toBe("display: grid");
    expect(sanitizeStyle("display: contents", policy)).toBe("");
  });
  it("can be extended via policy", () => {
    expect(sanitizeStyle("opacity: .5", policy)).toBe("");
    expect(sanitizeStyle("opacity: .5", resolvePolicy({ allowStyleProperties: ["opacity"] }))).toBe("opacity: .5");
  });
});

describe("sanitizeTree", () => {
  it("drops script/style with their content", () => {
    expect(clean(h("div", null, [h("script", null, "alert(1)"), text("ok"), h("style", null, "*{}")]))).toBe("<div>ok</div>");
  });
  it("unwraps unknown tags but keeps their children", () => {
    expect(clean(h("div", null, [h("blink", null, [h("b", null, "x")])]))).toBe("<div><b>x</b></div>");
  });
  it("removes event handler and unknown attributes", () => {
    expect(clean(h("p", { onclick: "x()", onmouseover: "y()", id: "a", name: "b", class: "c" }, "t"))).toBe('<p class="c">t</p>');
  });
  it("keeps data-* and aria-* attributes", () => {
    expect(clean(h("div", { "data-x": "1", "aria-label": "l" }))).toBe('<div data-x="1" aria-label="l"></div>');
  });
  it("opt-in attributes", () => {
    expect(clean(h("p", { id: "a" }), { allowAttributes: ["id"] })).toBe('<p id="a"></p>');
  });
  it("neutralizes unsafe hrefs but keeps the link text", () => {
    expect(clean(h("a", { href: "javascript:alert(1)" }, "x"))).toBe("<a>x</a>");
  });
  it("adds rel to target=_blank links", () => {
    expect(clean(h("a", { href: "https://x.test", target: "_blank" }, "x"))).toBe(
      '<a href="https://x.test" target="_blank" rel="noopener noreferrer">x</a>',
    );
    expect(clean(h("a", { href: "https://x.test", target: "_blank", rel: "author" }, "x"))).toContain('rel="author noopener noreferrer"');
  });
  it("rejects unknown target values", () => {
    expect(clean(h("a", { href: "https://x.test", target: "evilframe" }, "x"))).toBe('<a href="https://x.test">x</a>');
  });
  it("roles are allowlisted", () => {
    expect(clean(h("div", { role: "checkbox" }))).toBe('<div role="checkbox"></div>');
    expect(clean(h("div", { role: "button" }))).toBe("<div></div>");
  });

  describe("iframes", () => {
    const iframe = (src: string) => h("iframe", { src, width: 560 });
    it("keeps allowlisted embeds", () => {
      expect(clean(iframe("https://www.youtube-nocookie.com/embed/abc"))).toContain("<iframe");
      expect(clean(iframe("https://www.figma.com/embed?url=x"))).toContain("<iframe");
      expect(clean(iframe("https://player.vimeo.com/video/1"))).toContain("<iframe");
    });
    it.each([
      "https://evil.example/embed",
      "https://www.youtube.com.evil.example/embed/x",
      "https://www.youtube.com/embedevil",
      "https://www.figma.com.evil.test/embed",
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "https://www.youtube.com\\@evil.test/embed/x",
      "https://www.youtube.com/embed/x y",
    ])("drops %j", (src) => {
      expect(clean(iframe(src))).toBe("");
    });
    it("drops iframes without src", () => {
      expect(clean(h("iframe"))).toBe("");
    });
    it("is extensible", () => {
      const policy = { iframeAllowlist: ["https://maps.example.com/embed/"] };
      expect(clean(iframe("https://maps.example.com/embed/x"), policy)).toContain("<iframe");
    });
  });

  it("allows data:image only on <img src>", () => {
    expect(clean(h("img", { src: "data:image/png;base64,AAAA" }))).toContain("data:image/png");
    expect(clean(h("a", { href: "data:image/png;base64,AAAA" }, "x"))).toBe("<a>x</a>");
    expect(clean(h("img", { src: "data:text/html,<script>" }))).toBe("<img>");
  });

  it("passes raw (trusted) nodes through untouched", () => {
    const out = sanitizeTree([{ type: "raw", html: "<b>trusted</b>" }], resolvePolicy());
    expect(serializeToHtml(out)).toBe("<b>trusted</b>");
  });

  it("is idempotent", () => {
    const tree = h("div", { onclick: "x", class: "a" }, [h("a", { href: "javascript:x", target: "_blank" }, "t")]);
    const policy = resolvePolicy();
    const once = sanitizeTree([tree], policy);
    expect(sanitizeTree(once, policy)).toEqual(once);
  });
});

describe("mergePolicies", () => {
  it("concatenates lists and per-tag maps", () => {
    const merged = mergePolicies(
      { allowTags: ["a"], allowAttributesByTag: { p: ["x"] } },
      { allowTags: ["b"], allowAttributesByTag: { p: ["y"] } },
      undefined,
    );
    expect(merged.allowTags).toEqual(["a", "b"]);
    expect(merged.allowAttributesByTag).toEqual({ p: ["x", "y"] });
  });
});
