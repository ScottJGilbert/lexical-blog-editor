import { StrictMode, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type { EditorState, LexicalEditor } from "lexical";
import { defineExtension } from "lexical";
import { Editor, defineEditorExtension, UPLOAD_MEDIA_COMMAND, type UploadEvent } from "@scottjgilbert/lexical-blog-editor/editor";
import "@scottjgilbert/lexical-blog-editor/editor/styles.css";
import "@scottjgilbert/lexical-blog-editor/styles/ViewerTheme.css";
import "@scottjgilbert/lexical-blog-editor-ext-callout/styles.css";
import "katex/dist/katex.min.css";
import { Viewer } from "@scottjgilbert/lexical-blog-editor/react";
import { mountViewer, renderToHtml } from "@scottjgilbert/lexical-blog-editor/html";
import { katexRenderExtension } from "@scottjgilbert/lexical-blog-editor/render/katex";
import { calloutEditor } from "@scottjgilbert/lexical-blog-editor-ext-callout/editor";
import { calloutRender } from "@scottjgilbert/lexical-blog-editor-ext-callout/render";
import { useEffect } from "react";
import { $createParagraphNode, $createTextNode, $getSelection, $isRangeSelection } from "lexical";

declare global {
  interface Window {
    __state: string;
    __events: UploadEvent[];
    __editor: LexicalEditor | null;
    __lexicalExtReady: boolean;
    __setViewerState: (json: string) => void;
    __renderToHtml: (json: string) => string;
    __xss: boolean;
    __uploadFiles: (files: File[], altText?: string) => void;
  }
}

const params = new URLSearchParams(location.search);
const mode = params.get("mode") ?? "default";
const delay = Number(params.get("delay") ?? "0");
const fail = params.get("fail") === "1";

window.__events = [];
window.__editor = null;
window.__lexicalExtReady = false;
window.__xss = false;
window.__uploadFiles = (files, altText) => {
  window.__editor!.dispatchCommand(UPLOAD_MEDIA_COMMAND, { files, altText });
};

// A plain Lexical extension, installed the way Lexical documents it.
const myLexicalExtension = defineExtension({
  name: "e2e/plain-lexical-extension",
  register: () => {
    window.__lexicalExtReady = true;
    return () => {};
  },
});

// A downstream blog-editor extension: no package, just a slash-menu entry.
const helloExtension = defineEditorExtension({
  name: "e2e/hello",
  slashMenu: [
    {
      title: "Hello Extension",
      keywords: ["hello"],
      onSelect: ({ editor }) =>
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) selection.insertNodes([$createTextNode("Hello from extension")]);
        }),
    },
  ],
  insertMenu: [{ title: "Hello Insert", onSelect: ({ editor }) => editor.update(() => {
    const s = $getSelection();
    if ($isRangeSelection(s)) s.insertNodes([$createParagraphNode().append($createTextNode("Inserted via menu"))]);
  }) }],
});

const extensions = [calloutEditor, helloExtension];
const lexicalExtensions = [myLexicalExtension];
const renderExtensions = [calloutRender, katexRenderExtension];

async function fakeUpload(file: File, ctx: { signal: AbortSignal; onProgress(f: number): void }) {
  ctx.onProgress(0.5);
  if (delay) {
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(resolve, delay);
      ctx.signal.addEventListener("abort", () => { clearTimeout(t); reject(new DOMException("Aborted", "AbortError")); });
    });
  }
  const body = new FormData();
  body.set("file", file);
  const res = await fetch(`/api/upload${fail ? "?fail=1" : ""}`, { method: "POST", body, signal: ctx.signal });
  if (!res.ok) throw new Error(`Upload failed with ${res.status}`);
  ctx.onProgress(1);
  const { url } = (await res.json()) as { url: string };
  return url;
}

function HtmlViewer({ state }: { state: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) mountViewer(ref.current, state, { extensions: renderExtensions });
  }, [state]);
  return <div id="viewer-html" ref={ref} />;
}

function App() {
  const [state, setState] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [override, setOverride] = useState<string | null>(null);

  const viewerState = override ?? state;
  const saved = useMemo(() => {
    try { return localStorage.getItem("e2e-state") ?? undefined; } catch { return undefined; }
  }, []);

  useEffect(() => {
    window.__state = state;
  }, [state]);
  window.__setViewerState = (json) => setOverride(json);
  window.__renderToHtml = (json) => renderToHtml(json, { extensions: renderExtensions });

  const onChange = (editorState: EditorState) => {
    const json = JSON.stringify(editorState.toJSON());
    window.__state = json;
    setState(json);
    try { localStorage.setItem("e2e-state", json); } catch { /* ignore */ }
  };

  const onUploadEvent = (event: UploadEvent) => {
    window.__events.push(event);
    setEvents((e) => [...e, `${event.type}:${event.kind}:${event.file.name}`]);
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Editor
        placeholder="Write here"
        initialState={params.get("restore") ? saved : undefined}
        onChange={onChange}
        extensions={extensions}
        lexicalExtensions={lexicalExtensions}
        onReady={(editor) => { window.__editor = editor; }}
        onUploadEvent={onUploadEvent}
        {...(mode === "no-handler" ? {} : { onUpload: fakeUpload })}
        {...(mode === "images-only" ? { kinds: ["image"] as const } : {})}
        {...(mode === "small" ? { maxFileSize: 100 } : {})}
      />
      <h3>React viewer</h3>
      <div id="viewer-react">
        {viewerState && <Viewer state={viewerState} extensions={renderExtensions} />}
      </div>
      <h3>HTML viewer</h3>
      {viewerState && <HtmlViewer state={viewerState} />}
      <pre id="events">{events.join("\n")}</pre>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
