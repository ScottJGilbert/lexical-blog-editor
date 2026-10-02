// src/editor/EditorExport.tsx
"use client";

import React, { Suspense, useEffect, useState } from "react";
import type { EditorProps } from "./Editor";

const ClientEditor = React.lazy(() =>
  import("./Editor").then((mod) => ({ default: mod.Editor })),
);

/**
 * The editor needs a browser, so it renders a placeholder on the server and
 * during hydration, then mounts the real editor on the client. Safe to use in
 * SSR frameworks (Next.js, Remix, ...).
 */
export function Editor(props: EditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (typeof window === "undefined" || !mounted) {
    return (
      <div className="LexicalBlogEditor__loading" role="status" aria-live="polite">
        <p>Loading editor...</p>
        <div className="LexicalBlogEditor__skeleton" />
      </div>
    );
  }

  return (
    <Suspense fallback={null}>
      <ClientEditor {...props} />
    </Suspense>
  );
}

export type { EditorProps } from "./Editor";
