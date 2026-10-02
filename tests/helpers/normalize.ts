/**
 * Normalizes HTML so two serializations of the same DOM compare equal:
 * attribute order, style declaration formatting, `rgb()` vs hex colors,
 * boolean attribute spelling.
 */
const hexToRgb = (v: string) =>
  v.replace(/#([0-9a-f]{6})\b/gi, (_, h: string) => {
    const n = parseInt(h, 16);
    return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
  });

export function normalizeStyle(style: string): string {
  return style
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const i = d.indexOf(":");
      return `${d.slice(0, i).trim().toLowerCase()}: ${hexToRgb(d.slice(i + 1).trim())}`;
    })
    .sort()
    .join("; ");
}

export interface NormalizeOptions {
  attrs?: string[];
  styleProps?: string[];
  /** Mutate the parsed document before comparing (deliberate deviations). */
  fixup?: (root: ParentNode) => void;
}

export function normalizeDom(root: ParentNode, ignore: NormalizeOptions = {}): string {
  const ignoreAttrs = new Set(ignore.attrs ?? []);
  const ignoreStyle = new Set(ignore.styleProps ?? []);
  const walk = (node: Node): string => {
    if (node.nodeType === 3) return (node.textContent ?? "").replace(/​/g, "");
    if (node.nodeType !== 1) return "";
    const el = node as Element;
    const attrs = Array.from(el.attributes)
      .filter((a) => !ignoreAttrs.has(a.name))
      .map((a) => {
        let value = a.value;
        if (a.name === "style") {
          value = normalizeStyle(value)
            .split("; ")
            .filter((d) => d && !ignoreStyle.has(d.split(":")[0]))
            .join("; ");
          if (!value) return null;
        }
        if (a.name === "class") value = value.split(/\s+/).filter(Boolean).sort().join(" ");
        return `${a.name}=${JSON.stringify(value)}`;
      })
      .filter(Boolean)
      .sort();
    const tag = el.tagName.toLowerCase();
    const kids = Array.from(el.childNodes).map(walk).join("");
    return `<${tag}${attrs.length ? " " + attrs.join(" ") : ""}>${kids}</${tag}>`;
  };
  return Array.from(root.childNodes).map(walk).join("\n");
}

export function normalizeHtml(html: string, ignore?: NormalizeOptions): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  // Merge adjacent text nodes after parsing.
  doc.body.normalize();
  ignore?.fixup?.(doc.body);
  doc.body.normalize();
  return normalizeDom(doc.body, ignore);
}
