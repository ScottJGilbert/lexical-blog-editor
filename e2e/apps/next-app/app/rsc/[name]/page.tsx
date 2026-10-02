// A React *Server* Component: the viewer renders on the server and ships no client JS.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Viewer } from "@scottjgilbert/lexical-blog-editor/react";
import { calloutRender } from "@scottjgilbert/lexical-blog-editor-ext-callout/render";
import { katexRenderExtension } from "@scottjgilbert/lexical-blog-editor/render/katex";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const state = readFileSync(join(process.cwd(), "../../../tests/fixtures", `${name.replace(/[^a-z-]/g, "")}.json`), "utf8");
  return (
    <main>
      <article id="post">
        <Viewer state={state} extensions={[calloutRender, katexRenderExtension]} />
      </article>
    </main>
  );
}
