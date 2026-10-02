// Same as render-all.mjs but through CommonJS `require()`.
const { readdirSync, readFileSync } = require("node:fs");
const { join } = require("node:path");
const { createElement } = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const core = require("@scottjgilbert/lexical-blog-editor");
const { renderToHtml } = require("@scottjgilbert/lexical-blog-editor/render");
const { katexRenderExtension } = require("@scottjgilbert/lexical-blog-editor/render/katex");
const { Viewer } = require("@scottjgilbert/lexical-blog-editor/react");
const htmlViewer = require("@scottjgilbert/lexical-blog-editor/html");
const callout = require("@scottjgilbert/lexical-blog-editor-ext-callout");
const { calloutRender } = require("@scottjgilbert/lexical-blog-editor-ext-callout/render");

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
console.log(JSON.stringify(out));
