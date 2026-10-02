export type MediaKind = "image" | "video" | "audio" | "file";

export interface MediaUploadResult {
  /** Public URL of the uploaded file. */
  src: string;
  /** Intrinsic size, if known (images/videos). */
  width?: number;
  height?: number;
  /** Image alt text; defaults to the file name. */
  altText?: string;
  /** Video poster image URL. */
  poster?: string;
  /** Display title (video/audio) */
  title?: string;
  /** Overrides for the file attachment node. */
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

export interface MediaUploadContext {
  /** Unique id of this upload (also reported on every event). */
  id: string;
  kind: MediaKind;
  /** Aborted when the user cancels or deletes the placeholder. Pass to fetch/XHR. */
  signal: AbortSignal;
  /** Report progress as a fraction between 0 and 1. */
  onProgress(fraction: number): void;
}

/**
 * Uploads `file` somewhere and resolves with its public URL (or a result
 * object). Throw/reject to fail the upload.
 *
 * ```ts
 * onUpload={async (file, { signal, onProgress }) => {
 *   const { url } = await myUploader(file, { signal, onProgress });
 *   return url;
 * }}
 * ```
 */
export type MediaUploadHandler = (
  file: File,
  ctx: MediaUploadContext,
) => Promise<MediaUploadResult | string>;

export type UploadErrorReason =
  | "handler-error"
  | "no-handler"
  | "too-large"
  | "type-not-accepted";

interface BaseEvent {
  id: string;
  file: File;
  kind: MediaKind;
  /** Uploads still in flight *after* this event. */
  pending: number;
}

/** Lifecycle events emitted for every file, in order: start -> progress* -> success|error|abort. */
export type UploadEvent =
  | (BaseEvent & { type: "start" })
  | (BaseEvent & { type: "progress"; progress: number })
  | (BaseEvent & { type: "success"; result: MediaUploadResult })
  | (BaseEvent & { type: "error"; error: Error; reason: UploadErrorReason })
  | (BaseEvent & { type: "abort" });

export interface MediaUploadOptions {
  /** Where files go. Without it, images are inlined as data URLs and other media is rejected. */
  onUpload?: MediaUploadHandler;
  /** Receives every {@link UploadEvent}. */
  onUploadEvent?: (event: UploadEvent) => void;
  /** Which kinds of media the editor accepts. Default: all. */
  kinds?: ReadonlyArray<MediaKind>;
  /** Override accepted MIME patterns per kind, e.g. `{ file: ["application/pdf"] }`. */
  accept?: Partial<Record<MediaKind, ReadonlyArray<string>>>;
  /** Maximum size in bytes, overall or per kind. */
  maxFileSize?: number | Partial<Record<MediaKind, number>>;
}
