/**
 * Builds authentic Lexical JSON by driving the *real* editor nodes. Only used
 * by the fixture generator and the oracle tests (jsdom environment).
 */
import { createHeadlessEditor } from "@lexical/headless";
import { $generateNodesFromDOM } from "@lexical/html";
import {
  $getRoot,
  $createParagraphNode,
  $createTextNode,
  type LexicalNode,
} from "lexical";
import ServerPlaygroundNodes from "../../packages/lexical-blog-editor/src/editor/nodes/PlaygroundNodes/ServerPlaygroundNodes";
import { buildHTMLConfig } from "../../packages/lexical-blog-editor/src/editor/buildHTMLConfig";

export function createFixtureEditor() {
  return createHeadlessEditor({
    namespace: "fixtures",
    nodes: [...ServerPlaygroundNodes],
    onError: (e) => {
      throw e;
    },
    html: buildHTMLConfig(),
  });
}

export function htmlToState(
  html: string,
  extra?: (nodes: LexicalNode[]) => LexicalNode[] | void,
): string {
  const editor = createFixtureEditor();
  editor.update(
    () => {
      const dom = new DOMParser().parseFromString(html, "text/html");
      let nodes = $generateNodesFromDOM(editor, dom);
      const replaced = extra?.(nodes);
      if (replaced) nodes = replaced;
      const root = $getRoot();
      root.clear();
      for (const n of nodes) {
        // Wrap stray inline nodes so the root only holds blocks.
        if ("isInline" in n && (n as any).isInline()) {
          const p = $createParagraphNode();
          p.append(n);
          root.append(p);
        } else {
          root.append(n);
        }
      }
      if (root.isEmpty()) root.append($createParagraphNode().append($createTextNode("")));
    },
    { discrete: true },
  );
  return JSON.stringify(editor.getEditorState().toJSON());
}
