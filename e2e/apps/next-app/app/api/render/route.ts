import { renderToHtml, InvalidEditorStateError } from "@scottjgilbert/lexical-blog-editor/render";
import { calloutRender } from "@scottjgilbert/lexical-blog-editor-ext-callout/render";
import { katexRenderExtension } from "@scottjgilbert/lexical-blog-editor/render/katex";

export async function POST(request: Request) {
  const { state } = await request.json();
  try {
    return new Response(renderToHtml(state, { extensions: [calloutRender, katexRenderExtension] }), {
      headers: { "content-type": "text/html; charset=utf-8", "x-runtime": "node" },
    });
  } catch (error) {
    if (error instanceof InvalidEditorStateError) return Response.json({ error: error.name }, { status: 400 });
    throw error;
  }
}
