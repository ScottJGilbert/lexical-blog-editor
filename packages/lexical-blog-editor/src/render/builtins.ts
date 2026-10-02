import { defineRenderExtension, h, text } from "../core";
import type {
  HElement,
  HNode,
  HProps,
  NodeRenderer,
  RenderContext,
  SerializedNode,
} from "../core";

/**
 * Renderers for every node type the editor ships with. They mirror what
 * Lexical's own `exportDOM` produces (verified by the differential tests in
 * `tests/oracle`) but run on plain JSON: no DOM, no React, no Lexical.
 */

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

type Loose = SerializedNode & Record<string, any>;

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const posNum = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined;

function joinStyle(...parts: Array<string | undefined | false>): string | undefined {
  const out = parts
    .filter((p): p is string => !!p && p.trim() !== "")
    .map((p) => p.trim().replace(/;+$/, ""))
    .join("; ");
  return out === "" ? undefined : out;
}

function classes(...names: Array<string | undefined | false | null>): string | undefined {
  const out = names.filter((n): n is string => !!n).join(" ");
  return out === "" ? undefined : out;
}

const BLOCK_TAGS = new Set([
  "address", "article", "aside", "blockquote", "canvas", "dd", "div", "dl",
  "dt", "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3",
  "h4", "h5", "h6", "header", "hr", "li", "main", "nav", "noscript", "ol", "p",
  "pre", "section", "table", "tfoot", "ul", "video",
]);

const isBlock = (n: HNode): n is HElement =>
  n.type === "element" && BLOCK_TAGS.has(n.tag);

const ALIGN: Record<number, string> = {
  1: "left", 2: "center", 3: "right", 4: "justify", 5: "start", 6: "end",
};

function alignOf(node: Loose): string | undefined {
  const f = node.format;
  if (typeof f === "string" && f !== "") return f;
  if (typeof f === "number" && ALIGN[f]) return ALIGN[f];
  return undefined;
}

/** Props shared by every element node: indent, direction, alignment. */
function elementProps(node: Loose, opts: { indent?: boolean; align?: boolean } = {}): HProps {
  const { indent = true, align = true } = opts;
  const indentValue = typeof node.indent === "number" && node.indent > 0 ? node.indent : 0;
  const align_ = align ? alignOf(node) : undefined;
  return {
    style: joinStyle(
      indent && indentValue > 0 && `padding-inline-start: ${indentValue * 40}px`,
      align_ && `text-align: ${align_}`,
    ),
    dir: node.direction === "ltr" || node.direction === "rtl" ? node.direction : undefined,
  };
}

const withBr = (node: Loose, children: HNode[]): HNode[] =>
  children.length === 0 ? [h("br")] : children;

// ---------------------------------------------------------------------------
// text
// ---------------------------------------------------------------------------

const BOLD = 1;
const ITALIC = 2;
const STRIKETHROUGH = 4;
const UNDERLINE = 8;
const CODE = 16;
const SUBSCRIPT = 32;
const SUPERSCRIPT = 64;
const HIGHLIGHT = 128;
const LOWERCASE = 256;
const UPPERCASE = 512;
const CAPITALIZE = 1024;

export interface TextOptions {
  /** Appended after the theme classes. */
  extraClass?: string | false;
  /** Replaces the theme classes entirely. */
  replaceClass?: string;
  /** Replace the contents (default: the node's text). */
  children?: HNode[];
}

/** Same element structure as Lexical's `TextNode.exportDOM`. */
export function renderTextNode(
  node: Loose,
  ctx: RenderContext,
  opts: TextOptions = {},
): HNode {
  const format = typeof node.format === "number" ? node.format : 0;
  const theme = ctx.theme.text ?? {};
  const outerTag =
    format & CODE ? "code"
    : format & HIGHLIGHT ? "mark"
    : format & SUBSCRIPT ? "sub"
    : format & SUPERSCRIPT ? "sup"
    : null;
  const innerTag = format & BOLD ? "strong" : format & ITALIC ? "em" : "span";

  const both = (format & UNDERLINE) !== 0 && (format & STRIKETHROUGH) !== 0;
  const themed: Array<string | undefined> = [];
  if (both) themed.push(theme.underlineStrikethrough);
  const flags: Array<[number, string | undefined, boolean]> = [
    [BOLD, theme.bold, false],
    [CAPITALIZE, theme.capitalize, false],
    [CODE, theme.code, false],
    [HIGHLIGHT, theme.highlight, false],
    [ITALIC, theme.italic, false],
    [LOWERCASE, theme.lowercase, false],
    [STRIKETHROUGH, theme.strikethrough, true],
    [SUBSCRIPT, theme.subscript, false],
    [SUPERSCRIPT, theme.superscript, false],
    [UNDERLINE, theme.underline, true],
    [UPPERCASE, theme.uppercase, false],
  ];
  for (const [flag, cls, underlineOrStrike] of flags) {
    if (!(format & flag)) continue;
    if (both && underlineOrStrike) continue;
    themed.push(cls);
  }
  const className =
    opts.replaceClass ?? classes(...themed, opts.extraClass || undefined);

  const transform =
    format & LOWERCASE ? "lowercase"
    : format & UPPERCASE ? "uppercase"
    : format & CAPITALIZE ? "capitalize"
    : undefined;
  const style = joinStyle(
    str(node.style),
    "white-space: pre-wrap",
    transform && `text-transform: ${transform}`,
  );

  const content = opts.children ?? [text(str(node.text))];
  let element: HElement;
  if (outerTag) {
    const inner = h(innerTag, { class: className }, content);
    element = h(outerTag, { spellcheck: outerTag === "code" ? "false" : undefined, style }, [inner]);
  } else {
    element = h(innerTag, { class: className, style }, content);
  }
  let out: HElement = element;
  if (format & BOLD) out = h("b", null, [out]);
  if (format & ITALIC) out = h("i", null, [out]);
  if (format & STRIKETHROUGH) out = h("s", null, [out]);
  if (format & UNDERLINE) out = h("u", null, [out]);
  return out;
}

// ---------------------------------------------------------------------------
// block + container nodes
// ---------------------------------------------------------------------------

const root: NodeRenderer = (node, ctx) => ctx.renderChildren(node);

const paragraph: NodeRenderer<Loose> = (node, ctx) => {
  const children = ctx.renderChildren(node);
  const props = { class: ctx.theme.paragraph, ...elementProps(node) };
  if (children.some(isBlock)) {
    return h("div", { ...props, role: "paragraph" }, children);
  }
  return h("p", props, withBr(node, children));
};

const heading: NodeRenderer<Loose> = (node, ctx) => {
  const tag = /^h[1-6]$/.test(str(node.tag)) ? str(node.tag) : "h2";
  const cls = ctx.theme.heading?.[tag as "h1"];
  return h(tag, { class: cls, ...elementProps(node) }, withBr(node, ctx.renderChildren(node)));
};

const quote: NodeRenderer<Loose> = (node, ctx) =>
  h(
    "blockquote",
    { class: ctx.theme.quote, ...elementProps(node) },
    withBr(node, ctx.renderChildren(node)),
  );

function listDepth(ctx: RenderContext): number {
  // `ancestors` already includes the list being rendered.
  let depth = 0;
  for (const a of ctx.ancestors) if (a.type === "list") depth++;
  return depth;
}

const list: NodeRenderer<Loose> = (node, ctx) => {
  const listType = str(node.listType);
  const tag = node.tag === "ol" || listType === "number" ? "ol" : "ul";
  const theme = ctx.theme.list ?? {};
  const depthClasses = tag === "ol" ? theme.olDepth ?? [] : [];
  const depth = listDepth(ctx);
  const depthClass = depthClasses.length
    ? depthClasses[(depth - 1) % depthClasses.length]
    : undefined;
  const start = typeof node.start === "number" ? node.start : 1;
  return h(
    tag,
    {
      class: classes(
        tag === "ul" ? theme.ul : undefined,
        listType === "check" && theme.checklist,
        depthClass,
      ),
      start: start !== 1 ? start : undefined,
    },
    ctx.renderChildren(node),
  );
};

const listitem: NodeRenderer<Loose> = (node, ctx) => {
  const theme = ctx.theme.list ?? {};
  // `ancestors` ends with the list item itself; its parent is one above.
  const parent = ctx.ancestors[ctx.ancestors.length - 2] as Loose | undefined;
  const isCheckList = parent?.type === "list" && parent.listType === "check";
  const checked = node.checked === true;
  const children = node.children ?? [];
  const hasNested = children.some((c) => c.type === "list");
  const isLeafCheckbox = isCheckList && children[0]?.type !== "list";
  return h(
    "li",
    {
      value: typeof node.value === "number" ? node.value : undefined,
      class: classes(
        theme.listitem,
        isCheckList && (checked ? theme.listitemChecked : theme.listitemUnchecked),
        hasNested && theme.nested?.listitem,
      ),
      role: isLeafCheckbox ? "checkbox" : undefined,
      "aria-checked": isLeafCheckbox ? (checked ? "true" : "false") : undefined,
      "aria-readonly": isLeafCheckbox ? "true" : undefined,
      style: joinStyle(
        str(node.style),
        alignOf(node) && `text-align: ${alignOf(node)}`,
      ),
      dir: node.direction === "ltr" || node.direction === "rtl" ? node.direction : undefined,
    },
    ctx.renderChildren(node),
  );
};

const link: NodeRenderer<Loose> = (node, ctx) => {
  if (node.type === "autolink" && node.isUnlinked === true) {
    return h("span", null, ctx.renderChildren(node));
  }
  return h(
    "a",
    {
      href: str(node.url),
      target: str(node.target) || undefined,
      rel: str(node.rel) || undefined,
      title: str(node.title) || undefined,
      class: ctx.theme.link,
    },
    ctx.renderChildren(node),
  );
};

const code: NodeRenderer<Loose> = (node, ctx) => {
  const children = ctx.renderChildren(node);
  const lines = children.filter((c) => c.type === "element" && c.tag === "br").length + 1;
  return h(
    "pre",
    {
      class: ctx.theme.code,
      spellcheck: "false",
      "data-language": str(node.language) || undefined,
      "data-theme": str(node.theme) || undefined,
      style: str(node.style) || undefined,
      "data-gutter": Array.from({ length: lines }, (_, i) => i + 1).join("\n"),
    },
    children,
  );
};

const codeHighlight: NodeRenderer<Loose> = (node, ctx) => {
  const type = str(node.highlightType);
  const cls = type ? ctx.theme.codeHighlight?.[type] : undefined;
  return renderTextNode(node, ctx, { replaceClass: cls });
};

const linebreak: NodeRenderer = () => h("br");

const tab: NodeRenderer<Loose> = (node, ctx) =>
  renderTextNode(node, ctx, { extraClass: ctx.theme.tab });

const plainText: NodeRenderer<Loose> = (node, ctx) => renderTextNode(node, ctx);

// ---------------------------------------------------------------------------
// table
// ---------------------------------------------------------------------------

const table: NodeRenderer<Loose> = (node, ctx) => {
  const rows = (node.children ?? []) as Loose[];
  // Column count: lay cells on a grid so rowSpan/colSpan are honored.
  const occupied: boolean[][] = [];
  let columns = 0;
  rows.forEach((row, r) => {
    occupied[r] ??= [];
    let c = 0;
    for (const cell of (row.children ?? []) as Loose[]) {
      while (occupied[r][c]) c++;
      const colSpan = Math.max(1, Number(cell.colSpan) || 1);
      const rowSpan = Math.max(1, Number(cell.rowSpan) || 1);
      for (let dr = 0; dr < rowSpan && dr < 1000; dr++) {
        occupied[r + dr] ??= [];
        for (let dc = 0; dc < colSpan && dc < 1000; dc++) occupied[r + dr][c + dc] = true;
      }
      c += colSpan;
      columns = Math.max(columns, c);
    }
  });
  const widths: unknown[] = Array.isArray(node.colWidths) ? node.colWidths : [];
  const cols = Array.from({ length: Math.min(columns, 1000) }, (_, i) =>
    h("col", { style: posNum(widths[i]) ? `width: ${widths[i]}px` : undefined }),
  );
  const align = alignOf(node);
  const alignClass =
    align === "center" ? ctx.theme.tableAlignment?.center
    : align === "right" ? ctx.theme.tableAlignment?.right
    : undefined;
  return h(
    "table",
    { class: classes(ctx.theme.table, alignClass), style: str(node.style) || undefined },
    [h("colgroup", null, cols), h("tbody", null, ctx.renderChildren(node))],
  );
};

const tablerow: NodeRenderer<Loose> = (node, ctx) =>
  h(
    "tr",
    { style: posNum(node.height) ? `height: ${node.height}px` : undefined },
    ctx.renderChildren(node),
  );

const tablecell: NodeRenderer<Loose> = (node, ctx) => {
  const isHeader = typeof node.headerState === "number" && node.headerState !== 0;
  const bg = str(node.backgroundColor) || null;
  return h(
    isHeader ? "th" : "td",
    {
      colspan: Number(node.colSpan) > 1 ? Number(node.colSpan) : undefined,
      rowspan: Number(node.rowSpan) > 1 ? Number(node.rowSpan) : undefined,
      class: classes(ctx.theme.tableCell, isHeader && ctx.theme.tableCellHeader),
      style: joinStyle(
        bg && `background-color: ${bg}`,
        "border: 1px solid black",
        `width: ${posNum(node.width) ?? 75}px`,
        `vertical-align: ${str(node.verticalAlign) || "top"}`,
        "text-align: start",
        bg === null && isHeader && "background-color: rgb(242, 243, 245)",
      ),
    },
    ctx.renderChildren(node),
  );
};

// ---------------------------------------------------------------------------
// media + embeds
// ---------------------------------------------------------------------------

const horizontalrule: NodeRenderer = () => h("hr");

const image: NodeRenderer<Loose> = (node, ctx) => {
  const src = str(node.src);
  if (!src) return null; // e.g. an upload that never finished
  const img = h("img", {
    src,
    alt: str(node.altText),
    width: posNum(node.width),
    height: posNum(node.height),
    loading: "lazy",
    decoding: "async",
  });
  const captionState = node.caption?.editorState;
  if (node.showCaption === true && captionState) {
    let caption = ctx.renderState(captionState);
    // Same as Lexical: don't keep a lone wrapping paragraph.
    if (caption.length === 1 && caption[0].type === "element" && caption[0].tag === "p") {
      caption = caption[0].children;
    }
    if (caption.length > 0) {
      return h("figure", null, [img, h("figcaption", null, caption)]);
    }
  }
  return img;
};

const MEDIA_PROPS = (node: Loose) => ({
  src: str(node.src),
  title: str(node.title) || undefined,
  controls: node.controls === false ? undefined : true,
  loop: node.loop === true || undefined,
});

const video: NodeRenderer<Loose> = (node) => {
  const src = str(node.src);
  if (!src) return null;
  return h(
    "video",
    {
      ...MEDIA_PROPS(node),
      poster: str(node.poster) || undefined,
      width: posNum(node.width),
      height: posNum(node.height),
      muted: node.muted === true || undefined,
      autoplay: node.autoplay === true || undefined,
      playsinline: true,
      preload: "metadata",
    },
    [h("a", { href: src }, str(node.title) || "Download video")],
  );
};

const audio: NodeRenderer<Loose> = (node) => {
  const src = str(node.src);
  if (!src) return null;
  return h("audio", { ...MEDIA_PROPS(node), preload: "metadata" }, [
    h("a", { href: src }, str(node.title) || "Download audio"),
  ]);
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
}

const file: NodeRenderer<Loose> = (node, ctx) => {
  const src = str(node.src);
  if (!src) return null;
  const name = str(node.fileName) || "Download";
  const size = posNum(node.fileSize);
  return h(
    "div",
    { class: ctx.theme.file as string | undefined, "data-lexical-file": "true" },
    [
      h("a", { href: src, download: name }, name),
      size ? h("span", { class: "file-size" }, ` (${formatBytes(size)})`) : text(""),
    ].filter((n) => !(n.type === "text" && n.value === "")),
  );
};

const youtube: NodeRenderer<Loose> = (node) => {
  const id = str(node.videoID);
  if (!id) return null;
  return h("iframe", {
    "data-lexical-youtube": id,
    width: 560,
    height: 315,
    src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`,
    frameborder: "0",
    allow:
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
    allowfullscreen: true,
    title: "YouTube video",
    loading: "lazy",
  });
};

const tweet: NodeRenderer<Loose> = (node, ctx) => {
  const id = str(node.id);
  if (!id) return null;
  const url = `https://x.com/i/web/status/${encodeURIComponent(id)}`;
  return h("div", { "data-lexical-tweet-id": id, class: ctx.theme.embedBlock?.base }, [
    h("a", { href: url, target: "_blank", rel: "noopener noreferrer" }, url),
  ]);
};

const figma: NodeRenderer<Loose> = (node) => {
  const id = str(node.documentID);
  if (!id) return null;
  return h("iframe", {
    "data-lexical-figma": id,
    width: 560,
    height: 315,
    src: `https://www.figma.com/embed?embed_host=lexical&url=${encodeURIComponent(
      `https://www.figma.com/file/${id}`,
    )}`,
    allowfullscreen: true,
    title: "Figma embed",
    loading: "lazy",
  });
};

// Base64 (UTF-8) without relying on btoa/Buffer so every runtime agrees.
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function toBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const [a, b, c] = [bytes[i], bytes[i + 1], bytes[i + 2]];
    out += B64[a >> 2] + B64[((a & 3) << 4) | ((b ?? 0) >> 4)];
    out += b === undefined ? "=" : B64[((b & 15) << 2) | ((c ?? 0) >> 6)];
    out += c === undefined ? "=" : B64[c & 63];
  }
  return out;
}

/**
 * Typesetting needs KaTeX, which is large, so it lives in
 * `@scottjgilbert/lexical-blog-editor/render/katex`. Without it equations
 * degrade to their LaTeX source.
 */
const equation: NodeRenderer<Loose> = (node) => {
  const source = str(node.equation);
  const inline = node.inline === true;
  return h(
    inline ? "span" : "div",
    {
      "data-lexical-equation": toBase64(source),
      "data-lexical-inline": inline ? "true" : "false",
    },
    [h("code", { class: "equation-source" }, source)],
  );
};

// ---------------------------------------------------------------------------
// layout, collapsible
// ---------------------------------------------------------------------------

const layoutContainer: NodeRenderer<Loose> = (node, ctx) =>
  h(
    "div",
    {
      class: ctx.theme.layoutContainer,
      style: `grid-template-columns: ${str(node.templateColumns)}`,
      "data-lexical-layout-container": "true",
    },
    ctx.renderChildren(node),
  );

const layoutItem: NodeRenderer<Loose> = (node, ctx) =>
  h(
    "div",
    { class: ctx.theme.layoutItem, "data-lexical-layout-item": "true" },
    ctx.renderChildren(node),
  );

const collapsibleContainer: NodeRenderer<Loose> = (node, ctx) =>
  h(
    "details",
    { class: "Collapsible__container", open: node.open === true || undefined },
    ctx.renderChildren(node),
  );

const collapsibleTitle: NodeRenderer<Loose> = (node, ctx) =>
  h("summary", { class: "Collapsible__title" }, ctx.renderChildren(node));

const collapsibleContent: NodeRenderer<Loose> = (node, ctx) =>
  h(
    "div",
    { class: "Collapsible__content", "data-lexical-collapsible-content": "true" },
    ctx.renderChildren(node),
  );

// ---------------------------------------------------------------------------
// inline specials
// ---------------------------------------------------------------------------

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => n.toString().padStart(2, "0");

/** `Tue Mar 05 2024 12:30` in UTC; the time is omitted at exactly 00:00. */
export function defaultFormatDateTime(date: Date): string {
  const day = `${DAYS[date.getUTCDay()]} ${MONTHS[date.getUTCMonth()]} ${pad(date.getUTCDate())} ${date.getUTCFullYear()}`;
  const h_ = date.getUTCHours();
  const m = date.getUTCMinutes();
  return h_ === 0 && m === 0 ? day : `${day} ${pad(h_)}:${pad(m)}`;
}

const datetime: NodeRenderer<Loose> = (node, ctx) => {
  const raw = str(node.dateTime);
  const date = new Date(raw);
  if (!raw || Number.isNaN(date.getTime())) return null;
  const format = ctx.options.formatDateTime ?? defaultFormatDateTime;
  return h("span", { "data-lexical-datetime": date.toISOString() }, format(date));
};

const emoji: NodeRenderer<Loose> = (node, ctx) => {
  const inner = h("span", { class: "emoji-inner" }, str(node.text));
  return renderTextNode(node, ctx, {
    replaceClass: str(node.className) || undefined,
    children: [inner],
  });
};

const keyword: NodeRenderer<Loose> = (node, ctx) =>
  renderTextNode(node, ctx, { replaceClass: "keyword" });

const hashtag: NodeRenderer<Loose> = (node, ctx) =>
  renderTextNode(node, ctx, { extraClass: ctx.theme.hashtag });

const specialText: NodeRenderer<Loose> = (node, ctx) =>
  renderTextNode(node, ctx, { replaceClass: ctx.theme.specialText });

const mention: NodeRenderer<Loose> = (node) => {
  const name = str(node.mentionName);
  const label = str(node.text);
  return h(
    "span",
    {
      "data-lexical-mention": "true",
      "data-lexical-mention-name": name && name !== label ? name : undefined,
    },
    label,
  );
};

// ---------------------------------------------------------------------------

export const builtinRenderExtension = defineRenderExtension({
  name: "@scottjgilbert/lexical-blog-editor/builtin",
  nodes: {
    root,
    paragraph,
    heading,
    quote,
    list,
    listitem,
    link,
    autolink: link,
    code,
    "code-highlight": codeHighlight,
    linebreak,
    tab,
    text: plainText,
    table,
    tablerow,
    tablecell,
    horizontalrule,
    image,
    video,
    audio,
    file,
    youtube,
    tweet,
    figma,
    equation,
    "layout-container": layoutContainer,
    "layout-item": layoutItem,
    "collapsible-container": collapsibleContainer,
    "collapsible-title": collapsibleTitle,
    "collapsible-content": collapsibleContent,
    datetime,
    emoji,
    keyword,
    hashtag,
    specialText,
    mention,
    // Transparent wrappers: render their children only.
    mark: root,
    overflow: root,
  },
  sanitize: {
    allowAttributesByTag: {
      // tweet/figma/youtube markers are plain data-* attributes (always allowed)
    },
  },
});
