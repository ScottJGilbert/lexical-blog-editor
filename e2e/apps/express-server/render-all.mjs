// Renders every fixture with real Node ESM resolution (no bundler, no Vite).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as core from "@scottjgilbert/lexical-blog-editor";
import { renderToHtml } from "@scottjgilbert/lexical-blog-editor/render";
import { katexRenderExtension } from "@scottjgilbert/lexical-blog-editor/render/katex";
import { Viewer } from "@scottjgilbert/lexical-blog-editor/react";
import * as htmlViewer from "@scottjgilbert/lexical-blog-editor/html";
import * as callout from "@scottjgilbert/lexical-blog-editor-ext-callout";
import { calloutRender } from "@scottjgilbert/lexical-blog-editor-ext-callout/render";

const dir = process.argv[2];
const out = { render: {}, react: {}, exports: {} };
for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const name = f.slice(0, -5);
  const state = readFileSync(join(dir, f), "utf8");
  const options = name === "equation" ? { extensions: [katexRenderExtension] } : {};
  out.render[name] = renderToHtml(state, options);
  out.react[name] = renderToStaticMarkup(createElement(Viewer, { state, ...options }));
}
out.exports = {
  core: Object.keys(core).sort(),
  html: Object.keys(htmlViewer).sort(),
  callout: Object.keys(callout).sort(),
  calloutRender: calloutRender.name,
};
// The browser-only entry must be import-safe on the server (SSR of a client component).
const editor = await import("@scottjgilbert/lexical-blog-editor/editor");
out.editorImportable = typeof editor.Editor === "function" && typeof editor.defineEditorExtension === "function";
const calloutEditor = await import("@scottjgilbert/lexical-blog-editor-ext-callout/editor");
out.calloutEditorImportable = typeof calloutEditor.calloutEditor === "object";
console.log(JSON.stringify(out));
