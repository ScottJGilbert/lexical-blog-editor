"use client";

import { useEffect, useReducer } from "react";
import type { JSX } from "react";
import { useUploadManager } from "./context";
import type { MediaKind } from "./types";

export default function UploadPlaceholderComponent({
  uploadId,
  fileName,
  kind,
}: {
  uploadId: string;
  fileName: string;
  kind: MediaKind;
}): JSX.Element {
  const manager = useUploadManager();
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  useEffect(() => manager?.onChange(rerender), [manager]);

  const upload = manager?.pending.get(uploadId);
  const percent = Math.round((upload?.progress ?? 0) * 100);

  return (
    <span
      className="LexicalBlogEditor__uploadPlaceholder"
      contentEditable={false}
      role="progressbar"
      aria-label={`Uploading ${kind} ${fileName}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      data-upload-id={uploadId}
    >
      <span className="LexicalBlogEditor__uploadSpinner" aria-hidden="true" />
      <span className="LexicalBlogEditor__uploadName">{fileName}</span>
      {percent > 0 && <span className="LexicalBlogEditor__uploadPercent">{percent}%</span>}
      <button
        type="button"
        className="LexicalBlogEditor__uploadCancel"
        aria-label={`Cancel upload of ${fileName}`}
        onClick={() => manager?.cancel(uploadId)}
      >
        ×
      </button>
    </span>
  );
}
