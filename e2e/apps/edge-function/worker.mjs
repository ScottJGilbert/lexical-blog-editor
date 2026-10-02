// A Web-standard (Request -> Response) handler: Cloudflare Workers, Vercel Edge,
// Deno Deploy, Netlify Edge... No Node built-ins, no DOM.
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { createRenderer, InvalidEditorStateError } from "@scottjgilbert/lexical-blog-editor/render";
import { katexRenderExtension } from "@scottjgilbert/lexical-blog-editor/render/katex";
import { Viewer } from "@scottjgilbert/lexical-blog-editor/react";
import { calloutRender } from "@scottjgilbert/lexical-blog-editor-ext-callout/render";

const extensions = [calloutRender, katexRenderExtension];
const renderer = createRenderer({ extensions });

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== "POST") return new Response("POST a Lexical state", { status: 405 });
    const { state } = await request.json();
    try {
      if (url.pathname === "/render") {
        return new Response(renderer.renderToHtml(state), { headers: { "content-type": "text/html; charset=utf-8" } });
      }
      if (url.pathname === "/render-react") {
        const stream = await renderToReadableStream(createElement(Viewer, { state, extensions }));
        await stream.allReady;
        return new Response(stream, { headers: { "content-type": "text/html; charset=utf-8" } });
      }
      if (url.pathname === "/env") {
        return Response.json({
          process: typeof process,
          require: typeof require, // reported by the bundler shim; ignored by the test
          window: typeof window,
          document: typeof document,
          buffer: typeof Buffer,
        });
      }
      return new Response("not found", { status: 404 });
    } catch (error) {
      if (error instanceof InvalidEditorStateError) return Response.json({ error: error.name }, { status: 400 });
      return new Response("error", { status: 500 });
    }
  },
};
