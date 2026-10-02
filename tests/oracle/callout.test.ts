import { describe, expect, it } from "vitest";
import { createHeadlessEditor } from "@lexical/headless";
import { $createParagraphNode, $createTextNode, $getRoot } from "lexical";
import ServerPlaygroundNodes from "../../packages/lexical-blog-editor/src/editor/nodes/PlaygroundNodes/ServerPlaygroundNodes";
import { CalloutNode, $createCalloutNode, calloutEditor } from "../../packages/ext-callout/src/editor";
import { calloutRender } from "../../packages/ext-callout/src/render";
import { renderToHtml } from "@blog/render";
import { resolveEditorExtensions } from "../../packages/lexical-blog-editor/src/editor/extensions";

function editorWithCallout() {
  const resolved = resolveEditorExtensions([calloutEditor]);
  return createHeadlessEditor({
    namespace: "callout-test",
    nodes: [...ServerPlaygroundNodes, ...(resolved.nodes as any)],
    onError: (e) => { throw e; },
  });
}

describe("ext-callout editor node", () => {
  it("serializes, round-trips and renders", () => {
    const editor = editorWithCallout();
    editor.update(() => {
      const callout = $createCalloutNode("danger");
      callout.append($createParagraphNode().append($createTextNode("Boom")));
      $getRoot().clear().append(callout);
    }, { discrete: true });
    const json = editor.getEditorState().toJSON();
    expect((json.root.children[0] as any)).toMatchObject({ type: "callout", kind: "danger" });

    const again = editorWithCallout();
    again.setEditorState(again.parseEditorState(JSON.stringify(json)));
    expect(again.getEditorState().toJSON()).toEqual(json);

    const html = renderToHtml(JSON.stringify(json), { extensions: [calloutRender] });
    expect(html).toContain('class="Callout Callout--danger"');
    expect(html).toContain("Boom");
  });

  it("contributes menu entries for every kind", () => {
    expect(calloutEditor.slashMenu.map((i) => i.title)).toEqual(["Info Callout", "Tip Callout", "Warning Callout", "Danger Callout"]);
    expect(calloutEditor.insertMenu.map((i) => i.title)).toEqual(["Callout"]);
    expect(calloutEditor.nodes).toEqual([CalloutNode]);
  });

  it("exports DOM with the callout class and kind", () => {
    const editor = editorWithCallout();
    let exported = "";
    editor.update(() => {
      const callout = $createCalloutNode("tip");
      callout.append($createParagraphNode().append($createTextNode("x")));
      $getRoot().clear().append(callout);
      exported = (callout.exportDOM().element as HTMLElement).outerHTML;
    }, { discrete: true });
    expect(exported).toBe('<aside class="Callout Callout--tip" data-callout="tip"></aside>');
  });
});
