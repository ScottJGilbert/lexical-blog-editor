/**
 * Shared types for every environment (server, browser, edge).
 *
 * This module must stay free of runtime imports: no React, no DOM, no Lexical.
 * It describes the *serialized* Lexical state (the JSON produced by
 * `editorState.toJSON()`) and the intermediate HTML tree ("HNode") that every
 * renderer in this package produces.
 */

// ---------------------------------------------------------------------------
// Serialized Lexical state
// ---------------------------------------------------------------------------

/** Any serialized Lexical node. Unknown node types are preserved verbatim. */
export interface SerializedNode {
  type: string;
  version?: number;
  children?: SerializedNode[];
  [key: string]: unknown;
}

export interface SerializedRoot extends SerializedNode {
  type: "root";
  children: SerializedNode[];
}

/** The shape produced by `JSON.stringify(editorState.toJSON())`. */
export interface SerializedEditorState {
  root: SerializedRoot;
  [key: string]: unknown;
}

/**
 * Anything the renderers accept as input:
 *  - the JSON string saved from the editor
 *  - the parsed object
 *  - a Lexical `EditorState` (anything with a `toJSON()` method)
 */
export type EditorStateInput =
  | string
  | SerializedEditorState
  | { toJSON(): unknown };

// ---------------------------------------------------------------------------
// Serialized shapes of the built-in nodes that need more than `children`
// ---------------------------------------------------------------------------

export interface SerializedTextLike extends SerializedNode {
  text: string;
  format?: number;
  style?: string;
  detail?: number;
  mode?: string;
}

export interface SerializedElementLike extends SerializedNode {
  format?: string | number;
  indent?: number;
  direction?: "ltr" | "rtl" | null;
}

export interface SerializedImage extends SerializedNode {
  type: "image";
  src: string;
  altText: string;
  width?: number | "inherit";
  height?: number | "inherit";
  maxWidth?: number;
  showCaption?: boolean;
  caption?: { editorState?: SerializedEditorState };
}

export interface SerializedVideo extends SerializedNode {
  type: "video";
  src: string;
  poster?: string;
  title?: string;
  width?: number | "inherit";
  height?: number | "inherit";
  controls?: boolean;
  loop?: boolean;
  muted?: boolean;
  autoplay?: boolean;
  mimeType?: string;
  format?: string | number;
}

export interface SerializedAudio extends SerializedNode {
  type: "audio";
  src: string;
  title?: string;
  controls?: boolean;
  loop?: boolean;
  mimeType?: string;
  format?: string | number;
}

export interface SerializedFile extends SerializedNode {
  type: "file";
  src: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  format?: string | number;
}

// ---------------------------------------------------------------------------
// HNode: the intermediate tree
// ---------------------------------------------------------------------------

export type HProp = string | number | boolean | null | undefined;
export type HProps = Record<string, HProp>;

export interface HElement {
  type: "element";
  tag: string;
  props: HProps;
  children: HNode[];
}

export interface HText {
  type: "text";
  value: string;
}

/**
 * Pre-rendered markup. Only *trusted renderer code* may produce this (for
 * example the KaTeX extension). It is passed through untouched by the
 * sanitizer, so never put user-controlled strings in here.
 */
export interface HRaw {
  type: "raw";
  html: string;
}

export type HNode = HElement | HText | HRaw;

// ---------------------------------------------------------------------------
// Renderer API
// ---------------------------------------------------------------------------

/** Class names applied by the built-in renderers. Override via `theme`. */
export interface RenderTheme {
  paragraph?: string;
  quote?: string;
  heading?: Partial<Record<"h1" | "h2" | "h3" | "h4" | "h5" | "h6", string>>;
  hr?: string;
  image?: string;
  indent?: string;
  link?: string;
  hashtag?: string;
  file?: string;
  mark?: string;
  code?: string;
  codeHighlight?: Record<string, string>;
  embedBlock?: { base?: string };
  layoutContainer?: string;
  layoutItem?: string;
  specialText?: string;
  tab?: string;
  list?: {
    ul?: string;
    olDepth?: string[];
    listitem?: string;
    listitemChecked?: string;
    listitemUnchecked?: string;
    checklist?: string;
    nested?: { listitem?: string };
  };
  table?: string;
  tableCell?: string;
  tableCellHeader?: string;
  tableScrollableWrapper?: string;
  tableAlignment?: { center?: string; right?: string };
  text?: {
    bold?: string;
    italic?: string;
    underline?: string;
    strikethrough?: string;
    underlineStrikethrough?: string;
    code?: string;
    highlight?: string;
    subscript?: string;
    superscript?: string;
    lowercase?: string;
    uppercase?: string;
    capitalize?: string;
  };
  [custom: string]: unknown;
}

export interface RenderContext {
  /** The resolved theme (defaults merged with user overrides). */
  theme: RenderTheme;
  /** Render the children of `node` to HNodes. */
  renderChildren(node: SerializedNode): HNode[];
  /** Render any single node (dispatches through the registry). */
  renderNode(node: SerializedNode): HNode[];
  /** Render a nested serialized editor state (e.g. an image caption). */
  renderState(state: SerializedEditorState): HNode[];
  /** Ancestors of the node currently being rendered (nearest last). */
  ancestors: readonly SerializedNode[];
  /** Report a non-fatal problem (unknown node, malformed value, ...). */
  warn(message: string, node?: SerializedNode): void;
  /** Free-form per-render storage for renderer extensions. */
  state: Map<unknown, unknown>;
  /** The options this render was created with (read-only). */
  options: Readonly<RenderOptions>;
}

/**
 * Turns one serialized node into zero or more HNodes. Renderers never touch
 * the DOM and never see raw strings from other nodes, which is what makes
 * output identical in Node, edge runtimes and browsers.
 */
export type NodeRenderer<N extends SerializedNode = SerializedNode> = (
  node: N,
  ctx: RenderContext,
) => HNode | HNode[] | null;

/** A map of Lexical node `type` -> renderer. */
export type NodeRenderers = Record<string, NodeRenderer<any>>;

export interface SanitizePolicy {
  /** Extra tags to allow (merged with the defaults). */
  allowTags?: string[];
  /** Extra attributes to allow on every tag. */
  allowAttributes?: string[];
  /** Extra attributes to allow per tag. */
  allowAttributesByTag?: Record<string, string[]>;
  /** Extra URL schemes (without the colon) allowed in href/src. */
  allowSchemes?: string[];
  /**
   * `<iframe src>` must start with one of these prefixes, otherwise the
   * iframe is removed. Defaults cover YouTube, Figma and X/Twitter embeds.
   */
  iframeAllowlist?: string[];
  /** Extra CSS properties allowed inside `style="..."`. */
  allowStyleProperties?: string[];
}

export interface RenderExtension {
  /** Unique name, used in warnings and for de-duplication. */
  name: string;
  /** Renderers for node types this extension owns. Later extensions win. */
  nodes?: NodeRenderers;
  /** Merged into the render theme (deeply). */
  theme?: RenderTheme;
  /** Merged into the sanitize policy (lists are concatenated). */
  sanitize?: SanitizePolicy;
  /** Other extensions this one requires; installed automatically first. */
  dependencies?: RenderExtension[];
}

export interface RenderOptions {
  /**
   * Strip anything unsafe from the output. Defaults to `true`; disable only
   * for content authored by people you fully trust.
   */
  sanitize?: boolean;
  /** Merged over the default sanitize policy. */
  sanitizePolicy?: SanitizePolicy;
  /** Extra class names, deep-merged over the default viewer theme. */
  theme?: RenderTheme;
  /** Render extensions: custom nodes, theme additions, policy additions. */
  extensions?: RenderExtension[];
  /** Hard limits protecting against hostile input. */
  limits?: { maxDepth?: number; maxNodes?: number };
  /** Called for every non-fatal problem. Defaults to a no-op. */
  onWarning?: (message: string, node?: SerializedNode) => void;
  /**
   * Text for `datetime` nodes. The default is a deterministic UTC rendering
   * (`Tue Mar 05 2024 12:30`) so output is identical on every server, edge
   * region and browser regardless of the local time zone.
   */
  formatDateTime?: (date: Date) => string;
}
