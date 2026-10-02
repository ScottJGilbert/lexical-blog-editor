// src/Editor.tsx
"use client";

import React, { Suspense, useEffect, useState } from "react";
import type { EditorProps } from "./Editor";

const ClientEditor = React.lazy(() =>
  import("./Editor").then((mod) => ({ default: mod.Editor })),
);

export function Editor(props: EditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (typeof window === "undefined" || !mounted) {
    return (
      <div className="space-y-4 p-4">
        <p className="text-gray-600">Loading editor...</p>
        <div className="h-10 bg-gray-200 rounded animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6" />
        </div>
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
