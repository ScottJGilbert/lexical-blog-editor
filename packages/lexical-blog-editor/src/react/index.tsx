import { createElement } from "react";
import type { JSX, ReactNode } from "react";
import { createRenderer } from "../render";
import type { Renderer } from "../render";
import type { EditorStateInput, HElement, RenderOptions } from "../core";
import { hnodesToReact } from "./to-react";
import type { ToReactOptions } from "./to-react";

export { hnodesToReact, styleToObject, toReactProps } from "./to-react";
export type { ToReactOptions } from "./to-react";
export { createRenderer } from "../render";
export type { Renderer } from "../render";
export type { RenderOptions } from "../core";

export interface ViewerProps extends RenderOptions {
  /** The saved editor state: JSON string, parsed object or `EditorState`. */
  state: EditorStateInput;
  /** Reuse a renderer built once with `createRenderer` (skips per-render setup). */
  renderer?: Renderer;
  /** Replace specific elements with your own components. */
  replace?: ToReactOptions["replace"];
  /** Class name for the wrapper element. */
  className?: string;
  /** Wrapper element tag. Default `div`. */
  as?: keyof JSX.IntrinsicElements;
  /** Shown instead of the content when `state` is invalid. */
  fallback?: ReactNode;
  /** Called when `state` is invalid or rendering throws. */
  onError?: (error: unknown) => void;
}

/**
 * Render saved editor state as React elements. Sanitized by default.
 *
 * Uses no hooks, no browser APIs and no `useEffect`, so it works as a React
 * Server Component, in SSR/streaming, and on the client with identical markup.
 */
export function Viewer({
  state,
  renderer,
  replace,
  className,
  as = "div",
  fallback,
  onError,
  ...options
}: ViewerProps): JSX.Element {
  try {
    const tree = (renderer ?? createRenderer(options)).renderToTree(state);
    return createElement(as, { className }, hnodesToReact(tree, { replace }));
  } catch (error) {
    onError?.(error);
    return createElement(
      "div",
      { className: "LexicalBlogViewer__Error", role: "alert" },
      fallback ?? createElement("strong", null, "Unable to render content."),
    );
  }
}

/** Render saved editor state to a React node (without the wrapper element). */
export function renderToReact(
  state: EditorStateInput,
  options: RenderOptions & { replace?: (el: HElement, h: { render: (n: never) => ReactNode }) => ReactNode | undefined } = {},
): ReactNode {
  const { replace, ...renderOptions } = options;
  return hnodesToReact(createRenderer(renderOptions).renderToTree(state), {
    replace: replace as ToReactOptions["replace"],
  });
}

export default Viewer;
