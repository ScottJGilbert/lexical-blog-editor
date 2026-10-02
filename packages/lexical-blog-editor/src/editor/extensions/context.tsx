import { createContext, useContext } from "react";
import type { InsertMenuItem, SlashMenuItem } from "./types";

export interface EditorExtensionsContextValue {
  slashMenu: ReadonlyArray<SlashMenuItem>;
  insertMenu: ReadonlyArray<InsertMenuItem>;
}

const EMPTY: EditorExtensionsContextValue = { slashMenu: [], insertMenu: [] };

export const EditorExtensionsContext =
  createContext<EditorExtensionsContextValue>(EMPTY);

/** Menu entries contributed by the installed extensions. */
export const useEditorExtensions = () => useContext(EditorExtensionsContext);
