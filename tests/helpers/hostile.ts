/**
 * Hand-written hostile editor states. Every one of these must render to HTML
 * with no executable content in *every* environment and output format.
 */
const text = (t: string, extra: Record<string, unknown> = {}) => ({
  type: "text", version: 1, text: t, format: 0, style: "", mode: "normal", detail: 0, ...extra,
});
const para = (...children: unknown[]) => ({
  type: "paragraph", version: 1, children, direction: null, format: "", indent: 0,
});
const doc = (...children: unknown[]) =>
  JSON.stringify({ root: { type: "root", version: 1, children, direction: null, format: "", indent: 0 } });

export const hostile: Record<string, string> = {
  "link-javascript-url": doc(
    para({ type: "link", version: 1, url: "javascript:alert(1)", children: [text("x")], rel: null, target: null, title: null }),
  ),
  "link-obfuscated-scheme": doc(
    para({ type: "link", version: 1, url: "  jav\tascript:alert(1)", children: [text("x")] }),
    para({ type: "link", version: 1, url: "JaVaScRiPt:alert(1)", children: [text("y")] }),
    para({ type: "link", version: 1, url: "data:text/html,<script>alert(1)</script>", children: [text("z")] }),
    para({ type: "link", version: 1, url: "vbscript:msgbox(1)", children: [text("w")] }),
  ),
  "image-bad-src": doc(
    para({ type: "image", version: 1, src: "javascript:alert(1)", altText: '" onerror="alert(1)', width: 10, height: 10, maxWidth: 10, showCaption: false, caption: { editorState: null } }),
    para({ type: "image", version: 1, src: "https://ok.example/x.png\" onerror=\"alert(1)", altText: "a", width: 0, height: 0, maxWidth: 10, showCaption: false, caption: { editorState: null } }),
  ),
  "text-markup": doc(
    para(text("<script>alert(1)</script><img src=x onerror=alert(1)>"), text("</p><script>alert(2)</script>")),
  ),
  "style-injection": doc(
    para(text("styled", { style: "color: red; background: url(javascript:alert(1)); position: fixed; top: 0; left:0; width: 100vw; font-size: 12px; behavior: url(x.htc); color: expression(alert(1))" })),
  ),
  "iframe-not-allowed": doc(
    { type: "youtube", version: 1, format: "", videoID: 'x" onload="alert(1)' },
  ),
  "code-language-injection": doc(
    { type: "code", version: 1, language: '"><script>alert(1)</script>', direction: null, format: "", indent: 0, children: [text("let x = 1;")] },
  ),
  "unknown-node-types": doc(
    { type: "script", version: 1, children: [text("alert(1)")] },
    { type: "__proto__", version: 1 },
    { type: "constructor", version: 1, children: [text("still renders children")] },
    para(text("survivor")),
  ),
  "list-class-injection": doc(
    { type: "list", version: 1, listType: "bullet", tag: "ul", start: 1, children: [{ type: "listitem", version: 1, value: 1, children: [text("a")], checked: false }], direction: null, format: "", indent: 0 },
  ),
  "equation-attr-injection": doc(
    { type: "equation", version: 1, equation: '"><img src=x onerror=alert(1)>', inline: true },
  ),
  "emoji-class-injection": doc(
    para({ ...text(":)", { mode: "token" }), type: "emoji", className: '" onmouseover="alert(1)' }),
  ),
  "table-style-injection": doc(
    { type: "table", version: 1, children: [{ type: "tablerow", version: 1, children: [{ type: "tablecell", version: 1, headerState: 0, colSpan: 1, rowSpan: 1, backgroundColor: "red; position: fixed", children: [para(text("c"))] }] }], direction: null, format: "", indent: 0 },
  ),
};

/** Strings that must never appear in sanitized output. */
export const FORBIDDEN = [
  /<script/i,
  /\sonerror\s*=/i,
  /\sonload\s*=/i,
  /\sonmouseover\s*=/i,
  /javascript:/i,
  /vbscript:/i,
  /data:text\/html/i,
  /expression\s*\(/i,
  /position:\s*fixed/i,
];
