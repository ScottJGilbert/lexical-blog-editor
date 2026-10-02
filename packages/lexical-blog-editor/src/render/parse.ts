import type { EditorStateInput, SerializedEditorState, SerializedNode } from "../core";
import { InvalidEditorStateError } from "./errors";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Normalize any accepted input into a serialized editor state.
 *
 * Accepts the JSON string saved from the editor, the parsed object, a bare
 * `{ editorState }` wrapper (as used by image captions) or a Lexical
 * `EditorState` instance. Throws {@link InvalidEditorStateError} otherwise.
 */
export function parseEditorState(input: EditorStateInput): SerializedEditorState {
  let value: unknown = input;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch (cause) {
      throw new InvalidEditorStateError("Editor state is not valid JSON", { cause });
    }
  }
  if (isObject(value) && typeof value.toJSON === "function") {
    value = (value.toJSON as () => unknown)();
  }
  if (isObject(value) && !("root" in value) && isObject(value.editorState)) {
    value = value.editorState;
  }
  if (!isObject(value) || !isObject(value.root)) {
    throw new InvalidEditorStateError(
      "Editor state must be an object with a `root` node",
    );
  }
  const root = value.root as SerializedNode;
  if (root.type !== "root" || !Array.isArray(root.children)) {
    throw new InvalidEditorStateError(
      "Editor state `root` must be a node of type \"root\" with `children`",
    );
  }
  return value as unknown as SerializedEditorState;
}
