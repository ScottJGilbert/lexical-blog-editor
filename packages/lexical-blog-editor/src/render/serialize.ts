import type { HNode, HProps } from "../core";

const VOID = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
  "source", "track", "wbr",
]);

export function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function serializeProps(props: HProps): string {
  let out = "";
  for (const [name, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (value === true) {
      out += ` ${name}`;
      continue;
    }
    out += ` ${name}="${escapeAttribute(String(value))}"`;
  }
  return out;
}

/** Serialize an HNode tree to an HTML string. Deterministic on every runtime. */
export function serializeToHtml(nodes: HNode[]): string {
  let out = "";
  for (const node of nodes) {
    if (node.type === "text") {
      out += escapeText(node.value);
    } else if (node.type === "raw") {
      out += node.html;
    } else {
      out += `<${node.tag}${serializeProps(node.props)}>`;
      if (!VOID.has(node.tag)) {
        out += serializeToHtml(node.children);
        out += `</${node.tag}>`;
      }
    }
  }
  return out;
}
