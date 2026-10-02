/**
 * Render half: safe to import on servers, edge runtimes and in browsers.
 *
 *   import { calloutRender } from "@scottjgilbert/lexical-blog-editor-ext-callout/render";
 *   renderToHtml(state, { extensions: [calloutRender] });
 *   <Viewer state={state} extensions={[calloutRender]} />
 */
import { defineRenderExtension, h } from "@scottjgilbert/lexical-blog-editor";
import { CALLOUT_NODE_TYPE, normalizeCalloutKind } from "./shared";

export const calloutRender = defineRenderExtension({
  name: "@scottjgilbert/lexical-blog-editor-ext-callout",
  nodes: {
    [CALLOUT_NODE_TYPE]: (node, ctx) => {
      const kind = normalizeCalloutKind(node.kind);
      return h(
        "aside",
        {
          class: `Callout Callout--${kind}`,
          "data-callout": kind,
          role: "note",
        },
        ctx.renderChildren(node),
      );
    },
  },
});

export { CALLOUT_KINDS } from "./shared";
export type { CalloutKind } from "./shared";
