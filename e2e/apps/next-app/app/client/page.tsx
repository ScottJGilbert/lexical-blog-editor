"use client";

import { useState } from "react";
import { Editor, type UploadEvent } from "@scottjgilbert/lexical-blog-editor/editor";
import "@scottjgilbert/lexical-blog-editor/editor/styles.css";
import { Viewer } from "@scottjgilbert/lexical-blog-editor/react";
import { calloutEditor } from "@scottjgilbert/lexical-blog-editor-ext-callout/editor";
import { calloutRender } from "@scottjgilbert/lexical-blog-editor-ext-callout/render";

const extensions = [calloutEditor];
const renderExtensions = [calloutRender];

export default function ClientPage() {
  const [state, setState] = useState("");
  const [log, setLog] = useState<string[]>([]);
  return (
    <main>
      <Editor
        onChange={(s) => setState(JSON.stringify(s.toJSON()))}
        extensions={extensions}
        onUpload={async (file) => URL.createObjectURL(file)}
        onUploadEvent={(e: UploadEvent) => setLog((l) => [...l, e.type])}
      />
      <div id="live">{state && <Viewer state={state} extensions={renderExtensions} />}</div>
      <pre id="log">{log.join(",")}</pre>
    </main>
  );
}
