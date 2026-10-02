import type { RenderExtension } from "./types";

/**
 * Declare a render-side extension. This is the half of an extension that runs
 * everywhere (servers, edge functions, browsers) and therefore must not import
 * React, the DOM or Lexical:
 *
 * ```ts
 * export const calloutRender = defineRenderExtension({
 *   name: "callout",
 *   nodes: {
 *     callout: (node, ctx) => h("aside", { class: "callout" }, ctx.renderChildren(node)),
 *   },
 * });
 * ```
 *
 * The editor half lives in `defineEditorExtension` (`/editor`). By convention
 * an extension package exports the render half from `<pkg>/render` and the
 * editor half from `<pkg>/editor`, so server bundles never see editor code.
 */
export function defineRenderExtension<T extends RenderExtension>(ext: T): T {
  return ext;
}

/**
 * Flatten `dependencies`, dependencies first, de-duplicated by `name`. When
 * the same name appears twice the *last* one wins (so users can override a
 * packaged extension by listing their own version after it).
 */
export function resolveRenderExtensions(
  extensions: readonly RenderExtension[] = [],
): RenderExtension[] {
  const byName = new Map<string, RenderExtension>();
  const visiting = new Set<string>();
  const visit = (ext: RenderExtension) => {
    if (visiting.has(ext.name)) return; // cycle
    visiting.add(ext.name);
    for (const dep of ext.dependencies ?? []) visit(dep);
    visiting.delete(ext.name);
    byName.delete(ext.name); // re-insert so ordering reflects the last use
    byName.set(ext.name, ext);
  };
  for (const ext of extensions) visit(ext);
  return [...byName.values()];
}
