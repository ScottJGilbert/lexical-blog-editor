// ESM Express server: the headless renderer and the React viewer on the server.
import express from "express";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderToHtml, createRenderer, InvalidEditorStateError, RenderLimitError } from "@scottjgilbert/lexical-blog-editor/render";
import { katexRenderExtension } from "@scottjgilbert/lexical-blog-editor/render/katex";
import { Viewer } from "@scottjgilbert/lexical-blog-editor/react";
import { calloutRender } from "@scottjgilbert/lexical-blog-editor-ext-callout/render";

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));
  const renderer = createRenderer({ extensions: [calloutRender, katexRenderExtension] });

  // POST /render { state } -> sanitized HTML
  app.post("/render", (req, res) => {
    try {
      res.type("html").send(renderer.renderToHtml(req.body.state));
    } catch (error) {
      if (error instanceof InvalidEditorStateError || error instanceof RenderLimitError) {
        return res.status(400).json({ error: error.name, message: error.message });
      }
      res.status(500).json({ error: "internal" });
    }
  });

  // POST /render-default: no extensions, one-shot helper
  app.post("/render-default", (req, res) => {
    res.type("html").send(renderToHtml(req.body.state));
  });

  // POST /render-react: React viewer rendered on the server
  app.post("/render-react", (req, res) => {
    res.type("html").send(
      renderToStaticMarkup(createElement(Viewer, { state: req.body.state, extensions: [calloutRender, katexRenderExtension] })),
    );
  });

  app.get("/health", (_req, res) => res.json({ ok: true, runtime: "esm" }));
  return app;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const server = createApp().listen(Number(process.env.PORT ?? 0), () => {
    console.log(`LISTENING ${server.address().port}`);
  });
}
