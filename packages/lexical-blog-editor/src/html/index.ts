/**
 * Client-side HTML viewer: renders saved editor state straight to HTML (no
 * React). Importing this module is safe on the server; only the functions that
 * need a DOM touch it, and only when called.
 */
import { createRenderer } from "../render";
import type { EditorStateInput, RenderOptions } from "../core";

export { createRenderer, renderToHtml } from "../render";
export type { Renderer } from "../render";
export type { RenderOptions } from "../core";

export interface HtmlViewerOptions extends RenderOptions {
  /** Called when `state` is invalid or rendering throws. */
  onError?: (error: unknown) => void;
  /** Markup shown when rendering fails. */
  errorHtml?: string;
}

export interface HtmlViewer {
  /** Re-render with new state. */
  update(state: EditorStateInput): void;
  /** Empty the container. */
  destroy(): void;
  /** The sanitized HTML currently displayed. */
  readonly html: string;
}

const DEFAULT_ERROR_HTML =
  '<div class="LexicalBlogViewer__Error" role="alert"><strong>Unable to render content.</strong></div>';

/**
 * Render `state` into `container`.
 *
 * ```ts
 * const viewer = mountViewer(document.getElementById("post")!, savedJson);
 * viewer.update(newJson);
 * ```
 */
export function mountViewer(
  container: Element,
  state: EditorStateInput,
  options: HtmlViewerOptions = {},
): HtmlViewer {
  const { onError, errorHtml = DEFAULT_ERROR_HTML, ...renderOptions } = options;
  const renderer = createRenderer(renderOptions);
  let current = "";
  const update = (next: EditorStateInput) => {
    try {
      current = renderer.renderToHtml(next);
    } catch (error) {
      onError?.(error);
      current = errorHtml;
    }
    container.innerHTML = current;
  };
  update(state);
  return {
    update,
    destroy() {
      current = "";
      container.innerHTML = "";
    },
    get html() {
      return current;
    },
  };
}

/** Render to a detached `DocumentFragment` (uses `<template>`, so no scripts run). */
export function renderToFragment(
  state: EditorStateInput,
  options: RenderOptions = {},
  doc: Document = document,
): DocumentFragment {
  const template = doc.createElement("template");
  template.innerHTML = createRenderer(options).renderToHtml(state);
  return template.content;
}

/**
 * Register `<lexical-blog-viewer>`:
 *
 * ```html
 * <lexical-blog-viewer state='{"root":{...}}'></lexical-blog-viewer>
 * ```
 *
 * Set `.state` (string or object) or the `state` attribute. Options such as
 * extensions can be set through the `.options` property.
 */
export function defineViewerElement(tagName = "lexical-blog-viewer"): void {
  if (typeof customElements === "undefined" || customElements.get(tagName)) return;
  class LexicalBlogViewerElement extends HTMLElement {
    static observedAttributes = ["state"];
    private _state: EditorStateInput | null = null;
    private _options: HtmlViewerOptions = {};
    private _viewer: HtmlViewer | null = null;

    get state(): EditorStateInput | null {
      return this._state;
    }
    set state(value: EditorStateInput | null) {
      this._state = value;
      this.render();
    }
    get options(): HtmlViewerOptions {
      return this._options;
    }
    set options(value: HtmlViewerOptions) {
      this._options = value;
      this._viewer = null;
      this.render();
    }
    attributeChangedCallback(name: string, _old: string | null, value: string | null) {
      if (name === "state") this.state = value;
    }
    connectedCallback() {
      if (this._state === null && this.hasAttribute("state")) {
        this._state = this.getAttribute("state");
      }
      this.render();
    }
    private render() {
      if (!this.isConnected || this._state === null) return;
      if (this._viewer) this._viewer.update(this._state);
      else this._viewer = mountViewer(this, this._state, this._options);
    }
  }
  customElements.define(tagName, LexicalBlogViewerElement);
}
