import type {
  MediaKind,
  MediaUploadContext,
  MediaUploadOptions,
  MediaUploadResult,
  UploadErrorReason,
  UploadEvent,
} from "./types";

export const DEFAULT_ACCEPT: Record<MediaKind, ReadonlyArray<string>> = {
  image: ["image/*"],
  video: ["video/*"],
  audio: ["audio/*"],
  file: ["*/*"],
};

/** Without a handler, images are inlined; cap them so JSON stays reasonable. */
export const DATA_URL_MAX_BYTES = 5 * 1024 * 1024;

export function matchesMime(mime: string, patterns: ReadonlyArray<string>): boolean {
  const type = mime.toLowerCase();
  return patterns.some((p) => {
    const pattern = p.toLowerCase();
    if (pattern === "*/*" || pattern === "*") return true;
    if (pattern.endsWith("/*")) return type.startsWith(pattern.slice(0, -1));
    return type === pattern;
  });
}

export function classifyFile(file: Pick<File, "type" | "name">): MediaKind {
  const type = (file.type || "").toLowerCase();
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  return "file";
}

export class UploadError extends Error {
  constructor(message: string, readonly reason: UploadErrorReason, options?: { cause?: unknown }) {
    super(message);
    this.name = "UploadError";
    if (options?.cause !== undefined) (this as { cause?: unknown }).cause = options.cause;
  }
}

export interface PendingUpload {
  id: string;
  file: File;
  kind: MediaKind;
  progress: number;
  controller: AbortController;
}

export interface StartHooks {
  /** Called synchronously with the new upload before the handler runs. */
  onStart?(upload: PendingUpload): void;
  onProgress?(upload: PendingUpload): void;
  onSuccess?(upload: PendingUpload, result: MediaUploadResult): void;
  onError?(upload: PendingUpload | null, error: UploadError): void;
  onAbort?(upload: PendingUpload): void;
}

export async function readAsDataUrl(file: Blob): Promise<string> {
  if (typeof FileReader === "undefined") {
    // Non-browser runtimes (tests, SSR tooling): same result without FileReader.
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return `data:${file.type || "application/octet-stream"};base64,${btoa(binary)}`;
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Unexpected FileReader result"));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

let counter = 0;
const nextId = () => `upload-${Date.now().toString(36)}-${(counter++).toString(36)}`;

/**
 * Framework-agnostic upload orchestration: validation, lifecycle events,
 * cancellation. The editor plugin turns its callbacks into Lexical updates.
 */
export class UploadManager {
  private readonly pendingUploads = new Map<string, PendingUpload>();
  private readonly listeners = new Set<(event: UploadEvent) => void>();
  private readonly changeListeners = new Set<() => void>();

  constructor(private readonly getOptions: () => MediaUploadOptions) {}

  get pending(): ReadonlyMap<string, PendingUpload> {
    return this.pendingUploads;
  }

  /** Subscribe to lifecycle events. Returns an unsubscribe function. */
  subscribe(listener: (event: UploadEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Subscribe to *any* state change (progress included), for UI. */
  onChange(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  /** Which kinds are enabled. */
  enabledKinds(): ReadonlyArray<MediaKind> {
    return this.getOptions().kinds ?? ["image", "video", "audio", "file"];
  }

  /** `accept` attribute value for a file input covering `kinds`. */
  acceptAttribute(kinds: ReadonlyArray<MediaKind> = this.enabledKinds()): string {
    const accept = this.getOptions().accept;
    return kinds.flatMap((k) => accept?.[k] ?? DEFAULT_ACCEPT[k]).join(",");
  }

  /** Returns why `file` would be refused, or `null` if it is acceptable. */
  validate(file: File): { reason: UploadErrorReason; message: string } | null {
    const options = this.getOptions();
    const kind = classifyFile(file);
    if (!this.enabledKinds().includes(kind)) {
      return { reason: "type-not-accepted", message: `${kind} uploads are not enabled` };
    }
    const accepted = options.accept?.[kind] ?? DEFAULT_ACCEPT[kind];
    if (!matchesMime(file.type || "application/octet-stream", accepted)) {
      return { reason: "type-not-accepted", message: `"${file.type}" is not an accepted ${kind} type` };
    }
    if (!options.onUpload && kind !== "image") {
      return { reason: "no-handler", message: `Uploading ${kind} files requires an onUpload handler` };
    }
    const configured = options.maxFileSize;
    const limit =
      typeof configured === "number" ? configured : configured?.[kind] ?? (options.onUpload ? undefined : DATA_URL_MAX_BYTES);
    if (limit !== undefined && file.size > limit) {
      return { reason: "too-large", message: `${file.name} is larger than ${limit} bytes` };
    }
    return null;
  }

  private emit(event: UploadEvent) {
    for (const listener of [...this.listeners]) {
      try {
        listener(event);
      } catch (error) {
        // A throwing listener must never break uploads.
        console.error("[lexical-blog-editor] upload listener threw", error);
      }
    }
    for (const listener of [...this.changeListeners]) listener();
  }

  private base(upload: PendingUpload) {
    return { id: upload.id, file: upload.file, kind: upload.kind, pending: this.pendingUploads.size };
  }

  /** Cancel one upload. */
  cancel(id: string): void {
    const upload = this.pendingUploads.get(id);
    if (!upload) return;
    upload.controller.abort();
  }

  /** Cancel everything still in flight. */
  cancelAll(): void {
    for (const id of [...this.pendingUploads.keys()]) this.cancel(id);
  }

  /**
   * Validate and start uploading `file`. Always resolves; outcomes are
   * reported through the hooks and the event stream.
   */
  async start(file: File, hooks: StartHooks = {}): Promise<void> {
    const invalid = this.validate(file);
    if (invalid) {
      const error = new UploadError(invalid.message, invalid.reason);
      this.emit({ type: "error", id: nextId(), file, kind: classifyFile(file), pending: this.pendingUploads.size, error, reason: invalid.reason });
      hooks.onError?.(null, error);
      return;
    }

    const kind = classifyFile(file);
    const upload: PendingUpload = { id: nextId(), file, kind, progress: 0, controller: new AbortController() };
    this.pendingUploads.set(upload.id, upload);
    hooks.onStart?.(upload);
    this.emit({ type: "start", ...this.base(upload) });

    const ctx: MediaUploadContext = {
      id: upload.id,
      kind,
      signal: upload.controller.signal,
      onProgress: (fraction) => {
        if (!this.pendingUploads.has(upload.id)) return;
        upload.progress = Math.min(1, Math.max(0, Number.isFinite(fraction) ? fraction : 0));
        hooks.onProgress?.(upload);
        this.emit({ type: "progress", ...this.base(upload), progress: upload.progress });
      },
    };

    const abortion = new Promise<never>((_, reject) => {
      upload.controller.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    });

    try {
      const handler = this.getOptions().onUpload ?? (async (f: File) => readAsDataUrl(f));
      const raw = await Promise.race([handler(file, ctx), abortion]);
      const result: MediaUploadResult = typeof raw === "string" ? { src: raw } : raw;
      if (!result || typeof result.src !== "string" || result.src === "") {
        throw new Error("onUpload must resolve with a URL string or an object with a `src`");
      }
      this.pendingUploads.delete(upload.id);
      hooks.onSuccess?.(upload, result);
      this.emit({ type: "success", ...this.base(upload), result });
    } catch (cause) {
      this.pendingUploads.delete(upload.id);
      if (upload.controller.signal.aborted) {
        hooks.onAbort?.(upload);
        this.emit({ type: "abort", ...this.base(upload) });
        return;
      }
      const error = new UploadError(
        cause instanceof Error ? cause.message : String(cause),
        "handler-error",
        { cause },
      );
      hooks.onError?.(upload, error);
      this.emit({ type: "error", ...this.base(upload), error, reason: "handler-error" });
    }
  }
}
