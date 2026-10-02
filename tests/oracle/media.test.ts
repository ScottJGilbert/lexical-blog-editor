/**
 * Contract between the editor's media nodes and the renderer: JSON written by
 * the real nodes must render correctly, and the placeholder must never leak.
 */
import { describe, expect, it } from "vitest";
import { $createParagraphNode, $getRoot } from "lexical";
import { renderToHtml } from "@blog/render";
import { createFixtureEditor } from "../helpers/make-fixtures";
import { $createVideoNode } from "../../packages/lexical-blog-editor/src/editor/nodes/Media/VideoNode";
import { $createAudioNode } from "../../packages/lexical-blog-editor/src/editor/nodes/Media/AudioNode";
import { $createFileNode } from "../../packages/lexical-blog-editor/src/editor/nodes/Media/FileNode";
import { $createImageNode } from "../../packages/lexical-blog-editor/src/editor/nodes/ImageNode";
import { $createUploadPlaceholderNode } from "../../packages/lexical-blog-editor/src/editor/upload/UploadPlaceholderNode";
import { UploadPlaceholderNode } from "../../packages/lexical-blog-editor/src/editor/upload/UploadPlaceholderNode";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

function stateOf(fn: () => void): string {
  const editor = createFixtureEditor();
  editor.update(() => { $getRoot().clear(); fn(); }, { discrete: true });
  return JSON.stringify(editor.getEditorState().toJSON());
}

describe("editor media nodes -> renderer", () => {
  const state = stateOf(() => {
    $getRoot().append(
      $createVideoNode({ src: "https://cdn.test/v.mp4", poster: "https://cdn.test/p.jpg", width: 640, height: 360, controls: true, title: "Demo" }),
      $createAudioNode({ src: "https://cdn.test/a.mp3", controls: true }),
      $createFileNode({ src: "https://cdn.test/r.pdf", fileName: "Report.pdf", fileSize: 1536 }),
    );
  });

  if (process.env.UPDATE_FIXTURES) writeFileSync(join(__dirname, "..", "fixtures", "media.json"), JSON.stringify(JSON.parse(state), null, 2) + "\n");

  it("serializes with the documented shape", () => {
    const [video, audio, file] = JSON.parse(state).root.children;
    expect(video).toMatchObject({ type: "video", src: "https://cdn.test/v.mp4", poster: "https://cdn.test/p.jpg", width: 640, controls: true });
    expect(audio).toMatchObject({ type: "audio", src: "https://cdn.test/a.mp3" });
    expect(file).toMatchObject({ type: "file", src: "https://cdn.test/r.pdf", fileName: "Report.pdf", fileSize: 1536 });
  });
  it("renders every media kind", () => {
    const html = renderToHtml(state);
    expect(html).toContain('<video src="https://cdn.test/v.mp4"');
    expect(html).toContain('poster="https://cdn.test/p.jpg"');
    expect(html).toContain('<audio src="https://cdn.test/a.mp3"');
    expect(html).toContain('download="Report.pdf"');
    expect(html).toContain("(1.5 KB)");
  });
  it("round-trips through the editor unchanged", () => {
    const editor = createFixtureEditor();
    editor.setEditorState(editor.parseEditorState(state));
    expect(editor.getEditorState().toJSON()).toEqual(JSON.parse(state));
  });
  it("upload placeholders never render", () => {
    const withPlaceholder = stateOf(() => {
      const p = $createParagraphNode();
      p.append($createUploadPlaceholderNode("upload-1", "big.mov", "video"));
      $getRoot().append(p, $createParagraphNode());
    });
    expect(JSON.parse(withPlaceholder).root.children[0].children[0].type).toBe("upload-placeholder");
    const warnings: string[] = [];
    const html = renderToHtml(withPlaceholder, { onWarning: (m) => warnings.push(m) });
    expect(html).not.toContain("big.mov");
    expect(warnings).toEqual([]);
  });
  it("images with an empty src (failed upload residue) are dropped", () => {
    const s = stateOf(() => {
      $getRoot().append($createParagraphNode().append($createImageNode({ src: "", altText: "x" })));
    });
    expect(renderToHtml(s)).not.toContain("<img");
  });
  void UploadPlaceholderNode;
});
