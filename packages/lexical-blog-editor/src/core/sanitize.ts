import type { HElement, HNode, HProps, SanitizePolicy } from "./types";

/**
 * Allowlist sanitizer for the HNode tree.
 *
 * Every renderer (built-in or from an extension) produces an HNode tree, and
 * the tree is sanitized *before* it is serialized to a string, turned into
 * React elements or inserted into the DOM. Because it works on a tree instead
 * of an HTML string it needs no DOM, behaves identically on every runtime, and
 * cannot be fooled by parser differentials (mutation XSS).
 *
 * Everything not explicitly allowed is dropped.
 */

const DEFAULT_TAGS = [
  "a", "article", "aside", "audio", "b", "blockquote", "br", "caption", "code",
  "col", "colgroup", "details", "div", "em", "figcaption", "figure", "h1", "h2",
  "h3", "h4", "h5", "h6", "hr", "i", "iframe", "img", "li", "mark", "ol", "p",
  "pre", "s", "section", "small", "source", "span", "strong", "sub", "summary",
  "sup", "table", "tbody", "td", "tfoot", "th", "thead", "time", "tr", "u",
  "ul", "video",
];

/** Tags whose *content* is dropped together with the tag. */
const DROP_WITH_CONTENT = new Set([
  "script", "style", "template", "noscript", "object", "embed", "applet",
  "svg", "math", "form", "input", "button", "select", "textarea", "link",
  "meta", "base", "frame", "frameset", "title", "head",
]);

const GLOBAL_ATTRS = ["class", "style", "title", "dir", "lang", "role"];

const ATTRS_BY_TAG: Record<string, string[]> = {
  a: ["href", "target", "rel", "hreflang", "download"],
  audio: ["src", "controls", "loop", "muted", "preload"],
  col: ["span"],
  details: ["open"],
  iframe: [
    "src", "width", "height", "frameborder", "allow", "allowfullscreen",
    "loading", "referrerpolicy",
  ],
  img: ["src", "alt", "width", "height", "loading", "decoding"],
  li: ["value"],
  ol: ["start", "type", "reversed"],
  source: ["src", "type"],
  td: ["colspan", "rowspan", "headers"],
  th: ["colspan", "rowspan", "scope", "headers"],
  time: ["datetime"],
  video: [
    "src", "poster", "controls", "loop", "muted", "playsinline", "preload",
    "width", "height", "autoplay",
  ],
};

const ALLOWED_ROLES = new Set([
  "checkbox", "paragraph", "presentation", "none", "group", "img", "note",
  "figure", "list", "listitem", "region", "separator", "article",
]);

const DEFAULT_SCHEMES = ["http", "https", "mailto", "tel"];

export const DEFAULT_IFRAME_ALLOWLIST = [
  "https://www.youtube.com/embed/",
  "https://www.youtube-nocookie.com/embed/",
  "https://www.figma.com/embed",
  "https://player.vimeo.com/video/",
  "https://platform.twitter.com/",
  "https://twitframe.com/",
];

const DEFAULT_STYLE_PROPS = [
  "background-color", "color", "font-family", "font-size", "font-style",
  "font-weight", "line-height", "text-align", "text-decoration",
  "text-decoration-line", "text-indent", "text-transform", "vertical-align",
  "white-space", "padding-inline-start", "padding-left", "padding-right",
  "margin-left", "margin-right", "grid-template-columns", "display", "width",
  "height", "max-width", "min-width", "aspect-ratio", "border-collapse",
  "border", "border-top", "border-right", "border-bottom", "border-left",
  "border-color", "border-style", "border-width", "border-radius",
  "list-style-type", "direction", "unicode-bidi", "float", "clear",
];

// Allowed `display` values; anything else (e.g. `none` is fine, but not
// `contents` tricks) is rejected for predictability.
const DISPLAY_VALUES = new Set([
  "block", "inline", "inline-block", "flex", "grid", "table", "none",
  "list-item", "inline-flex", "inline-grid",
]);

const UNSAFE_CSS_VALUE =
  /url\s*\(|image-set|expression\s*\(|behavior|javascript|vbscript|@import|\\|\/\*|<|>|-moz-binding|var\s*\(/i;

export interface ResolvedPolicy {
  tags: Set<string>;
  attrs: Set<string>;
  attrsByTag: Record<string, Set<string>>;
  schemes: Set<string>;
  iframeAllowlist: string[];
  styleProps: Set<string>;
}

export function resolvePolicy(policy?: SanitizePolicy): ResolvedPolicy {
  const attrsByTag: Record<string, Set<string>> = {};
  for (const [tag, attrs] of Object.entries(ATTRS_BY_TAG)) {
    attrsByTag[tag] = new Set(attrs);
  }
  for (const [tag, attrs] of Object.entries(policy?.allowAttributesByTag ?? {})) {
    attrsByTag[tag] = new Set([...(attrsByTag[tag] ?? []), ...attrs]);
  }
  return {
    tags: new Set([...DEFAULT_TAGS, ...(policy?.allowTags ?? [])]),
    attrs: new Set([...GLOBAL_ATTRS, ...(policy?.allowAttributes ?? [])]),
    attrsByTag,
    schemes: new Set([...DEFAULT_SCHEMES, ...(policy?.allowSchemes ?? [])]),
    iframeAllowlist: [
      ...DEFAULT_IFRAME_ALLOWLIST,
      ...(policy?.iframeAllowlist ?? []),
    ],
    styleProps: new Set([
      ...DEFAULT_STYLE_PROPS,
      ...(policy?.allowStyleProperties ?? []),
    ]),
  };
}

/** Merge several partial policies (arrays concatenate). */
export function mergePolicies(
  ...policies: Array<SanitizePolicy | undefined>
): SanitizePolicy {
  const out: SanitizePolicy = {};
  for (const p of policies) {
    if (!p) continue;
    for (const key of [
      "allowTags",
      "allowAttributes",
      "allowSchemes",
      "iframeAllowlist",
      "allowStyleProperties",
    ] as const) {
      if (p[key]) out[key] = [...(out[key] ?? []), ...p[key]!];
    }
    if (p.allowAttributesByTag) {
      out.allowAttributesByTag = { ...(out.allowAttributesByTag ?? {}) };
      for (const [tag, attrs] of Object.entries(p.allowAttributesByTag)) {
        out.allowAttributesByTag[tag] = [
          ...(out.allowAttributesByTag[tag] ?? []),
          ...attrs,
        ];
      }
    }
  }
  return out;
}


const CONTROL_OR_SPACE = new RegExp("[\\u0000-\\u0020\\u007f-\\u009f\\u2028\\u2029]", "g");
const HAS_CONTROL_OR_SPACE = new RegExp("[\\u0000-\\u0020\\u007f-\\u009f\\u2028\\u2029]");

/**
 * Is `url` safe to put in an `href`/`src`? Relative URLs, fragments and the
 * allowed schemes pass. `data:` is only accepted when `allowDataImage` is set
 * and the payload is a raster/SVG image (an `<img>` never executes scripts).
 */
export function isSafeUrl(
  url: string,
  schemes: Set<string> | string[] = DEFAULT_SCHEMES,
  allowDataImage = false,
): boolean {
  const allowed = schemes instanceof Set ? schemes : new Set(schemes);
  // Browsers ignore whitespace/control characters inside the scheme, so
  // "java\tscript:" is a classic bypass. Normalize before inspecting.
  const compact = url.replace(CONTROL_OR_SPACE, "").toLowerCase();
  if (compact === "") return true;
  const match = /^([a-z][a-z0-9+.-]*):/.exec(compact);
  if (!match) return true; // relative, protocol-relative or fragment
  const scheme = match[1];
  if (scheme === "data") {
    return (
      allowDataImage &&
      /^data:image\/(png|jpe?g|gif|webp|avif|bmp|svg\+xml)[;,]/.test(compact)
    );
  }
  return allowed.has(scheme);
}

function matchesIframePrefix(src: string, prefix: string): boolean {
  if (HAS_CONTROL_OR_SPACE.test(src) || src.includes("\\")) return false;
  if (!src.startsWith(prefix)) return false;
  if (prefix.endsWith("/")) return true;
  const next = src.charAt(prefix.length);
  return next === "" || next === "/" || next === "?" || next === "#";
}

export function sanitizeStyle(style: string, policy: ResolvedPolicy): string {
  const out: string[] = [];
  for (const declaration of style.split(";")) {
    const idx = declaration.indexOf(":");
    if (idx === -1) continue;
    const prop = declaration.slice(0, idx).trim().toLowerCase();
    const value = declaration.slice(idx + 1).trim();
    if (!prop || !value) continue;
    if (!policy.styleProps.has(prop)) continue;
    if (UNSAFE_CSS_VALUE.test(value)) continue;
    if (prop === "display" && !DISPLAY_VALUES.has(value.toLowerCase())) continue;
    out.push(`${prop}: ${value}`);
  }
  return out.join("; ");
}

function sanitizeProps(
  tag: string,
  props: HProps,
  policy: ResolvedPolicy,
): HProps | null {
  const tagAttrs = policy.attrsByTag[tag];
  const out: HProps = {};
  for (const [rawName, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    const name = rawName.toLowerCase();
    if (!/^[a-z][a-z0-9_:.-]*$/.test(name)) continue;
    if (name.startsWith("on")) continue;

    const isData = name.startsWith("data-");
    const isAria = name.startsWith("aria-");
    if (
      !isData &&
      !isAria &&
      !policy.attrs.has(name) &&
      !(tagAttrs && tagAttrs.has(name))
    ) {
      continue;
    }

    if (value === true) {
      out[name] = true;
      continue;
    }
    const str = String(value);

    if (name === "style") {
      const cleaned = sanitizeStyle(str, policy);
      if (cleaned) out.style = cleaned;
      continue;
    }
    if (name === "role") {
      if (ALLOWED_ROLES.has(str)) out.role = str;
      continue;
    }
    if (name === "href" || name === "src" || name === "poster") {
      const allowData = (tag === "img" || name === "poster") && name !== "href";
      if (!isSafeUrl(str, policy.schemes, allowData)) continue;
      if (tag === "iframe" && name === "src") {
        if (!policy.iframeAllowlist.some((p) => matchesIframePrefix(str, p))) {
          return null; // drop the whole iframe
        }
      }
      out[name] = str;
      continue;
    }
    if (name === "target" && str !== "_blank" && str !== "_self") continue;
    out[name] = typeof value === "number" ? value : str;
  }

  if (tag === "iframe" && typeof out.src !== "string") return null;
  if (tag === "a" && out.target === "_blank") {
    // Prevent reverse tabnabbing regardless of what the node asked for.
    const rel = new Set(String(out.rel ?? "").split(/\s+/).filter(Boolean));
    rel.add("noopener");
    rel.add("noreferrer");
    out.rel = [...rel].join(" ");
  }
  return out;
}

function sanitizeNode(node: HNode, policy: ResolvedPolicy, out: HNode[]): void {
  if (node.type === "text" || node.type === "raw") {
    out.push(node);
    return;
  }
  const tag = node.tag.toLowerCase();
  if (DROP_WITH_CONTENT.has(tag)) return;

  const children: HNode[] = [];
  for (const child of node.children) sanitizeNode(child, policy, children);

  if (!policy.tags.has(tag)) {
    // Unknown tag: unwrap, keep the (already sanitized) children.
    out.push(...children);
    return;
  }
  const props = sanitizeProps(tag, node.props, policy);
  if (props === null) return;
  out.push({ type: "element", tag, props, children } satisfies HElement);
}

export function sanitizeTree(nodes: HNode[], policy: ResolvedPolicy): HNode[] {
  const out: HNode[] = [];
  for (const node of nodes) sanitizeNode(node, policy, out);
  return out;
}
