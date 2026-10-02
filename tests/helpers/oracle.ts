import { $generateHtmlFromNodes } from "@lexical/html";
import { createHeadlessEditor } from "@lexical/headless";
import ServerPlaygroundNodes from "../../packages/lexical-blog-editor/src/editor/nodes/PlaygroundNodes/ServerPlaygroundNodes";
import { buildHTMLConfig } from "../../packages/lexical-blog-editor/src/editor/buildHTMLConfig";
import { defaultRenderTheme } from "../../packages/lexical-blog-editor/src/core/theme";

/** HTML produced by Lexical's own exportDOM pipeline (needs a DOM). */
export function oracleHtml(state: string): string {
  const editor = createHeadlessEditor({
    namespace: "oracle",
    nodes: [...ServerPlaygroundNodes],
    onError: (e) => {
      throw e;
    },
    html: buildHTMLConfig(),
    theme: defaultRenderTheme as any,
  });
  editor.setEditorState(editor.parseEditorState(state));
  let html = "";
  editor.read(() => {
    html = $generateHtmlFromNodes(editor);
  });
  return html;
}
