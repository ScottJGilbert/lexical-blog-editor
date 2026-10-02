// The Cloudflare Workers entry used by the "lab" tests. It exercises the
// package the way a Worker would: no Node built-ins, no DOM, no eval.
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import * as root from "@scottjgilbert/lexical-blog-editor";
import * as render from "@scottjgilbert/lexical-blog-editor/render";
import * as react from "@scottjgilbert/lexical-blog-editor/react";
import * as html from "@scottjgilbert/lexical-blog-editor/html";
import { katexRenderExtension } from "@scottjgilbert/lexical-blog-editor/render/katex";
import { calloutRender } from "@scottjgilbert/lexical-blog-editor-ext-callout/render";

const extensions = [calloutRender, katexRenderExtension];
const renderer = render.createRenderer({ extensions });

const HTML = { "content-type": "text/html; charset=utf-8" };

function codegenAllowed() {
  try {
    // workerd forbids code generation from strings unless the allow_eval_during_startup flag is set.
    return new Function("return 1")() === 1;
  } catch {
    return false;
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/env") {
      return Response.json({
        navigator: typeof navigator === "object" ? navigator.userAgent : typeof navigator,
        process: typeof process,
        window: typeof window,
        document: typeof document,
        buffer: typeof Buffer,
        codegen: codegenAllowed(),
        entries: {
          root: Object.keys(root).sort(),
          render: Object.keys(render).sort(),
          react: Object.keys(react).sort(),
          html: Object.keys(html).sort(),
        },
      });
    }
    if (request.method !== "POST") return new Response("POST a Lexical state", { status: 405 });

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "BadJson" }, { status: 400 });
    }
    const { state } = body;
    try {
      if (url.pathname === "/render") {
        return new Response(renderer.renderToHtml(state), { headers: HTML });
      }
      if (url.pathname === "/render-fresh") {
        // A new renderer per request, default options (no extensions).
        return new Response(render.renderToHtml(state), { headers: HTML });
      }
      if (url.pathname === "/render-react") {
        const stream = await renderToReadableStream(createElement(react.Viewer, { state, extensions }));
        await stream.allReady;
        return new Response(stream, { headers: HTML });
      }
      if (url.pathname === "/render-timed") {
        const start = Date.now();
        const out = renderer.renderToHtml(state);
        return Response.json({ bytes: out.length, ms: Date.now() - start });
      }
      return new Response("not found", { status: 404 });
    } catch (error) {
      if (error instanceof render.InvalidEditorStateError) return Response.json({ error: error.name }, { status: 400 });
      if (error instanceof render.RenderLimitError) return Response.json({ error: error.name }, { status: 413 });
      return Response.json({ error: String(error && error.message) }, { status: 500 });
    }
  },
};
