/**
 * Headless, DOM-free rendering of serialized Lexical state.
 *
 * Runs unchanged in Node, Express, serverless functions, edge runtimes and
 * browsers; it never touches `window`, `document`, React or Lexical.
 */
import type { EditorStateInput, HNode, RenderOptions } from "../core";
import { createRenderer } from "./engine";

export { createRenderer } from "./engine";
export type { Renderer } from "./engine";
export { builtinRenderExtension, renderTextNode, defaultFormatDateTime } from "./builtins";
export { InvalidEditorStateError, RenderLimitError } from "./errors";
export { parseEditorState } from "./parse";
export { serializeToHtml, escapeAttribute, escapeText } from "./serialize";
export * from "../core";

/** One-shot render to a sanitized HTML string. */
export function renderToHtml(input: EditorStateInput, options?: RenderOptions): string {
  return createRenderer(options).renderToHtml(input);
}

/** One-shot render to the intermediate tree. */
export function renderToTree(input: EditorStateInput, options?: RenderOptions): HNode[] {
  return createRenderer(options).renderToTree(input);
}
