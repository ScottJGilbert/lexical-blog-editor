import type {
  AnyLexicalExtensionArgument,
  EditorThemeClasses,
  HTMLConfig,
  Klass,
  LexicalNode,
  LexicalNodeReplacement,
} from "lexical";
import type {
  EditorExtension,
  EditorPluginProps,
  InsertMenuItem,
  SlashMenuItem,
} from "./types";
import type { ComponentType } from "react";

export type {
  EditorExtension,
  EditorPluginProps,
  ExtensionMenuContext,
  InsertMenuItem,
  ShowModal,
  SlashMenuItem,
} from "./types";

/** Declare an editor extension (identity helper that gives you type checking). */
export function defineEditorExtension<T extends EditorExtension>(ext: T): T {
  return ext;
}

/** Everything the editor needs after merging all extensions. */
export interface ResolvedEditorExtensions {
  names: string[];
  nodes: Array<Klass<LexicalNode> | LexicalNodeReplacement>;
  theme: EditorThemeClasses;
  html: HTMLConfig;
  plugins: Array<ComponentType<EditorPluginProps>>;
  slashMenu: SlashMenuItem[];
  insertMenu: InsertMenuItem[];
  lexicalExtensions: AnyLexicalExtensionArgument[];
}

function mergeDeep<T extends object>(a: T, b: T | undefined): T {
  if (!b) return a;
  const out: Record<string, unknown> = { ...(a as Record<string, unknown>) };
  for (const [key, value] of Object.entries(b)) {
    const prev = out[key];
    out[key] =
      value && typeof value === "object" && !Array.isArray(value) &&
      prev && typeof prev === "object" && !Array.isArray(prev)
        ? mergeDeep(prev as object, value as object)
        : value;
  }
  return out as T;
}

/**
 * Flatten dependencies (dependencies first), de-duplicate by name (last one
 * wins) and merge everything into the shape the editor consumes.
 */
export function resolveEditorExtensions(
  extensions: ReadonlyArray<EditorExtension> = [],
): ResolvedEditorExtensions {
  const byName = new Map<string, EditorExtension>();
  const visiting = new Set<string>();
  const visit = (ext: EditorExtension) => {
    if (visiting.has(ext.name)) return;
    visiting.add(ext.name);
    for (const dep of ext.dependencies ?? []) visit(dep);
    visiting.delete(ext.name);
    byName.delete(ext.name);
    byName.set(ext.name, ext);
  };
  extensions.forEach(visit);

  const resolved: ResolvedEditorExtensions = {
    names: [],
    nodes: [],
    theme: {},
    html: {},
    plugins: [],
    slashMenu: [],
    insertMenu: [],
    lexicalExtensions: [],
  };
  const seenNodes = new Set<unknown>();
  for (const ext of byName.values()) {
    resolved.names.push(ext.name);
    for (const node of ext.nodes ?? []) {
      if (!seenNodes.has(node)) {
        seenNodes.add(node);
        resolved.nodes.push(node);
      }
    }
    resolved.theme = mergeDeep(resolved.theme, ext.theme);
    if (ext.html?.export) {
      resolved.html.export = new Map([...(resolved.html.export ?? []), ...ext.html.export]);
    }
    if (ext.html?.import) {
      resolved.html.import = { ...(resolved.html.import ?? {}), ...ext.html.import };
    }
    resolved.plugins.push(...(ext.plugins ?? []));
    resolved.slashMenu.push(...(ext.slashMenu ?? []));
    resolved.insertMenu.push(...(ext.insertMenu ?? []));
    resolved.lexicalExtensions.push(...(ext.lexicalExtensions ?? []));
  }
  return resolved;
}
