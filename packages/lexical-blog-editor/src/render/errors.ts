/** Thrown when the input is not a serialized Lexical editor state. */
export class InvalidEditorStateError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "InvalidEditorStateError";
    if (options?.cause !== undefined) (this as { cause?: unknown }).cause = options.cause;
  }
}

/** Thrown when input exceeds `limits.maxDepth` / `limits.maxNodes`. */
export class RenderLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RenderLimitError";
  }
}
