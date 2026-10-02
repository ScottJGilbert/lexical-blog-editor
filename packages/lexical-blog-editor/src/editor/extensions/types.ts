import type { ComponentType, ReactNode, JSX } from "react";
import type {
  AnyLexicalExtensionArgument,
  EditorThemeClasses,
  HTMLConfig,
  Klass,
  LexicalEditor,
  LexicalNode,
  LexicalNodeReplacement,
} from "lexical";

/** Opens the editor's modal dialog (same one the built-in menus use). */
export type ShowModal = (
  title: string,
  getContent: (onClose: () => void) => JSX.Element,
) => void;

export interface ExtensionMenuContext {
  editor: LexicalEditor;
  showModal: ShowModal;
}

/** An entry in the slash ("/") menu. */
export interface SlashMenuItem {
  title: string;
  /** Extra words the menu filters on. */
  keywords?: string[];
  icon?: ReactNode;
  onSelect(ctx: ExtensionMenuContext, query: string): void;
}

/** An entry in the toolbar's "Insert" dropdown. */
export interface InsertMenuItem {
  title: string;
  icon?: ReactNode;
  onSelect(ctx: ExtensionMenuContext): void;
}

export interface EditorPluginProps {
  /** The element floating UI (menus, toolbars) should be anchored to. */
  anchorElem: HTMLElement | null;
  isEditable: boolean;
}

/**
 * The editor half of a blog-editor extension.
 *
 * Everything is optional; an extension can be as small as one node class or as
 * large as a node + plugin + menu entries + a Lexical extension. To keep
 * server bundles free of editor code, ship the *render* half (see
 * `defineRenderExtension`) from a separate entry point, e.g.
 * `my-extension/render` and `my-extension/editor`.
 */
export interface EditorExtension {
  /** Unique name. Registering the same name twice keeps the last one. */
  name: string;
  /** Lexical node classes (or replacements) to register. */
  nodes?: ReadonlyArray<Klass<LexicalNode> | LexicalNodeReplacement>;
  /** Deep-merged into the editor theme. */
  theme?: EditorThemeClasses;
  /** Merged into the editor's DOM import/export configuration. */
  html?: HTMLConfig;
  /**
   * React components rendered inside the Lexical composer. Use
   * `useLexicalComposerContext()` to reach the editor, like any Lexical plugin.
   */
  plugins?: ReadonlyArray<ComponentType<EditorPluginProps>>;
  /** Items appended to the slash menu. */
  slashMenu?: ReadonlyArray<SlashMenuItem>;
  /** Items appended to the toolbar's Insert dropdown. */
  insertMenu?: ReadonlyArray<InsertMenuItem>;
  /**
   * Plain Lexical extensions (`defineExtension(...)`, `configExtension(...)`)
   * this extension builds on; installed as dependencies of the editor.
   */
  lexicalExtensions?: ReadonlyArray<AnyLexicalExtensionArgument>;
  /** Other blog-editor extensions this one requires. Installed first. */
  dependencies?: ReadonlyArray<EditorExtension>;
}
