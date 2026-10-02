import {
  defaultRenderTheme,
  mergePolicies,
  mergeTheme,
  resolvePolicy,
  resolveRenderExtensions,
  sanitizeTree,
} from "../core";
import type {
  EditorStateInput,
  HNode,
  NodeRenderer,
  RenderContext,
  RenderOptions,
  SerializedEditorState,
  SerializedNode,
} from "../core";
import { builtinRenderExtension } from "./builtins";
import { RenderLimitError } from "./errors";
import { parseEditorState } from "./parse";
import { serializeToHtml } from "./serialize";

export interface Renderer {
  /** Render to the (sanitized, unless disabled) intermediate tree. */
  renderToTree(input: EditorStateInput): HNode[];
  /** Render to an HTML string. */
  renderToHtml(input: EditorStateInput): string;
  readonly options: Readonly<RenderOptions>;
}

const DEFAULT_MAX_DEPTH = 256;
const DEFAULT_MAX_NODES = 200_000;

/**
 * Create a reusable renderer. Build one at startup (it resolves extensions,
 * theme and sanitize policy once) and call it per document.
 */
export function createRenderer(options: RenderOptions = {}): Renderer {
  const extensions = resolveRenderExtensions([
    builtinRenderExtension,
    ...(options.extensions ?? []),
  ]);

  const renderers = new Map<string, NodeRenderer<any>>();
  let theme = defaultRenderTheme;
  for (const ext of extensions) {
    for (const [type, fn] of Object.entries(ext.nodes ?? {})) renderers.set(type, fn);
    theme = mergeTheme(theme, ext.theme);
  }
  theme = mergeTheme(theme, options.theme);

  const sanitize = options.sanitize !== false;
  const policy = resolvePolicy(
    mergePolicies(...extensions.map((e) => e.sanitize), options.sanitizePolicy),
  );
  const maxDepth = options.limits?.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxNodes = options.limits?.maxNodes ?? DEFAULT_MAX_NODES;
  const warn = options.onWarning ?? (() => {});

  const renderState = (
    state: SerializedEditorState,
    shared: { count: number; store: Map<unknown, unknown> },
    baseDepth: number,
  ): HNode[] => {
    const ancestors: SerializedNode[] = [];

    const ctx: RenderContext = {
      theme,
      ancestors,
      options,
      state: shared.store,
      warn,
      renderChildren(node) {
        const out: HNode[] = [];
        for (const child of node.children ?? []) out.push(...ctx.renderNode(child));
        return out;
      },
      renderNode(node) {
        if (!node || typeof node !== "object" || typeof node.type !== "string") {
          warn("Skipped a malformed node", node as SerializedNode);
          return [];
        }
        if (++shared.count > maxNodes) {
          throw new RenderLimitError(`Document exceeds the maximum of ${maxNodes} nodes`);
        }
        if (baseDepth + ancestors.length >= maxDepth) {
          throw new RenderLimitError(`Document exceeds the maximum depth of ${maxDepth}`);
        }
        const renderer = renderers.get(node.type);
        let result: HNode | HNode[] | null | undefined;
        ancestors.push(node);
        try {
          if (renderer) {
            result = renderer(node, ctx);
          } else {
            warn(`No renderer for node type "${node.type}"`, node);
            result = Array.isArray(node.children) ? ctx.renderChildren(node) : null;
          }
        } catch (error) {
          if (error instanceof RenderLimitError) throw error;
          warn(
            `Renderer for "${node.type}" threw: ${
              error instanceof Error ? error.message : String(error)
            }`,
            node,
          );
          result = null;
        } finally {
          ancestors.pop();
        }
        if (!result) return [];
        return Array.isArray(result) ? result : [result];
      },
      renderState(nested) {
        // Parse defensively: nested states come from the same untrusted JSON.
        return renderState(parseEditorState(nested), shared, baseDepth + ancestors.length);
      },
    };
    return ctx.renderNode(state.root);
  };

  const renderToTree = (input: EditorStateInput): HNode[] => {
    const state = parseEditorState(input);
    const tree = renderState(state, { count: 0, store: new Map() }, 0);
    return sanitize ? sanitizeTree(tree, policy) : tree;
  };

  return {
    options,
    renderToTree,
    renderToHtml: (input) => serializeToHtml(renderToTree(input)),
  };
}
