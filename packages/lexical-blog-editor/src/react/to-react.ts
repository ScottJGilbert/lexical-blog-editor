import { createElement, type ReactNode } from "react";
import type { HElement, HNode, HProps } from "../core";

const ATTRIBUTE_MAP: Record<string, string> = {
  class: "className",
  for: "htmlFor",
  colspan: "colSpan",
  rowspan: "rowSpan",
  frameborder: "frameBorder",
  allowfullscreen: "allowFullScreen",
  datetime: "dateTime",
  playsinline: "playsInline",
  referrerpolicy: "referrerPolicy",
  spellcheck: "spellCheck",
  tabindex: "tabIndex",
  crossorigin: "crossOrigin",
  srcset: "srcSet",
  hreflang: "hrefLang",
  autoplay: "autoPlay",
  readonly: "readOnly",
};

/** `"font-size: 12px; --x: 1"` -> `{ fontSize: "12px", "--x": "1" }` */
export function styleToObject(style: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const declaration of style.split(";")) {
    const i = declaration.indexOf(":");
    if (i === -1) continue;
    const name = declaration.slice(0, i).trim();
    const value = declaration.slice(i + 1).trim();
    if (!name || !value) continue;
    const key = name.startsWith("--")
      ? name
      : name.toLowerCase().replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    out[key] = value;
  }
  return out;
}

export function toReactProps(props: HProps): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (name === "style") {
      out.style = styleToObject(String(value));
    } else {
      out[ATTRIBUTE_MAP[name] ?? name] = value;
    }
  }
  return out;
}

export interface ToReactOptions {
  /**
   * Swap any element for your own React node (return `undefined` to keep the
   * default). `render` renders the element's children for you.
   */
  replace?: (
    element: HElement,
    helpers: { render: (nodes: HNode[]) => ReactNode },
  ) => ReactNode | undefined;
}

/** Convert an HNode tree into React nodes. Deterministic keys, SSR-safe. */
export function hnodesToReact(nodes: HNode[], options: ToReactOptions = {}): ReactNode {
  const render = (list: HNode[], prefix: string): ReactNode[] =>
    list.map((node, index) => {
      const key = `${prefix}${index}`;
      if (node.type === "text") return node.value;
      if (node.type === "raw") {
        return createElement("span", {
          key,
          style: { display: "contents" },
          dangerouslySetInnerHTML: { __html: node.html },
        });
      }
      if (options.replace) {
        const replaced = options.replace(node, {
          render: (children) => render(children, `${key}.`),
        });
        if (replaced !== undefined) {
          return createElement("span", { key, style: { display: "contents" } }, replaced);
        }
      }
      const props = { ...toReactProps(node.props), key };
      const VOID = node.tag === "br" || node.tag === "hr" || node.tag === "img" || node.tag === "col" || node.tag === "source";
      return VOID
        ? createElement(node.tag, props)
        : createElement(node.tag, props, ...render(node.children, `${key}.`));
    });
  return render(nodes, "");
}
