// CommonJS Express server: proves `require()` works for every entry point.
const express = require("express");
const { createElement } = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { createRenderer, InvalidEditorStateError, RenderLimitError } = require("@scottjgilbert/lexical-blog-editor/render");
const { katexRenderExtension } = require("@scottjgilbert/lexical-blog-editor/render/katex");
const { Viewer } = require("@scottjgilbert/lexical-blog-editor/react");
const { calloutRender } = require("@scottjgilbert/lexical-blog-editor-ext-callout/render");

function createApp() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));
  const renderer = createRenderer({ extensions: [calloutRender, katexRenderExtension] });
  app.post("/render", (req, res) => {
    try {
      res.type("html").send(renderer.renderToHtml(req.body.state));
    } catch (error) {
      if (error instanceof InvalidEditorStateError || error instanceof RenderLimitError) return res.status(400).json({ error: error.name, message: error.message });
      res.status(500).json({ error: "internal" });
    }
  });
  app.post("/render-react", (req, res) => {
    res.type("html").send(
      renderToStaticMarkup(createElement(Viewer, { state: req.body.state, extensions: [calloutRender, katexRenderExtension] })),
    );
  });
  app.get("/health", (_req, res) => res.json({ ok: true, runtime: "cjs" }));
  return app;
}

module.exports = { createApp };

if (require.main === module) {
  const server = createApp().listen(Number(process.env.PORT || 0), () => {
    console.log(`LISTENING ${server.address().port}`);
  });
}
