/**
 * Optional KaTeX typesetting for `equation` nodes.
 *
 *   import { katexRenderExtension } from "@scottjgilbert/lexical-blog-editor/render/katex";
 *   renderToHtml(state, { extensions: [katexRenderExtension] });
 *
 * KaTeX is large, so it is kept out of the default renderer: viewers that never
 * show equations don't pay for it. Remember to include KaTeX's stylesheet
 * (`katex/dist/katex.min.css`) wherever the HTML is displayed.
 */
import katex from "katex";
import { defineRenderExtension, h, raw } from "../core";
import type { NodeRenderer, SerializedNode } from "../core";
import { toBase64 } from "./builtins";

const equation: NodeRenderer<SerializedNode & { equation?: unknown; inline?: unknown }> = (node) => {
  const source = typeof node.equation === "string" ? node.equation : "";
  const inline = node.inline === true;
  // KaTeX escapes its input and `trust: false` forbids \href/\url/\includegraphics.
  const html = katex.renderToString(source, {
    displayMode: !inline,
    errorColor: "#cc0000",
    output: "html",
    strict: "ignore",
    throwOnError: false,
    trust: false,
  });
  return h(
    inline ? "span" : "div",
    { "data-lexical-equation": toBase64(source), "data-lexical-inline": inline ? "true" : "false" },
    [raw(html)],
  );
};

export const katexRenderExtension = defineRenderExtension({
  name: "@scottjgilbert/lexical-blog-editor/katex",
  nodes: { equation },
});
