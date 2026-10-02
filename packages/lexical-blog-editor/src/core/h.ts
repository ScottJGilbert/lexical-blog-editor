import type { HElement, HNode, HProps, HText } from "./types";

/** Hyperscript helper used by renderers to build the HNode tree. */
export function h(
  tag: string,
  props: HProps | null = null,
  children: HNode | HNode[] | string | null = null,
): HElement {
  const list: HNode[] =
    children === null
      ? []
      : typeof children === "string"
        ? [text(children)]
        : Array.isArray(children)
          ? children
          : [children];
  return { type: "element", tag, props: props ?? {}, children: list };
}

export function text(value: string): HText {
  return { type: "text", value };
}

/** Pre-rendered *trusted* markup. See {@link HNode}. */
export function raw(html: string): HNode {
  return { type: "raw", html };
}
