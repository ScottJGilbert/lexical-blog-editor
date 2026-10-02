import type {
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";
import type { JSX } from "react";
import { DecoratorNode } from "lexical";
import type { MediaKind } from "./types";
import UploadPlaceholderComponent from "./UploadPlaceholderComponent";

export type SerializedUploadPlaceholderNode = Spread<
  { uploadId: string; fileName: string; kind: MediaKind },
  SerializedLexicalNode
>;

/**
 * Shown where a file is uploading. It is never meant to be persisted: the
 * upload plugin swaps it for the real node on success, removes it on failure,
 * and deletes any stale one it finds on load. Renderers ignore it.
 */
export class UploadPlaceholderNode extends DecoratorNode<JSX.Element> {
  __uploadId: string;
  __fileName: string;
  __kind: MediaKind;

  static getType(): string {
    return "upload-placeholder";
  }

  static clone(node: UploadPlaceholderNode): UploadPlaceholderNode {
    return new UploadPlaceholderNode(node.__uploadId, node.__fileName, node.__kind, node.__key);
  }

  static importJSON(serialized: SerializedUploadPlaceholderNode): UploadPlaceholderNode {
    return $createUploadPlaceholderNode(serialized.uploadId, serialized.fileName, serialized.kind);
  }

  exportJSON(): SerializedUploadPlaceholderNode {
    return {
      ...super.exportJSON(),
      uploadId: this.__uploadId,
      fileName: this.__fileName,
      kind: this.__kind,
    };
  }

  constructor(uploadId: string, fileName: string, kind: MediaKind, key?: NodeKey) {
    super(key);
    this.__uploadId = uploadId;
    this.__fileName = fileName;
    this.__kind = kind;
  }

  getUploadId(): string {
    return this.__uploadId;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const span = document.createElement("span");
    span.className = "LexicalBlogEditor__uploadPlaceholder";
    return span;
  }

  updateDOM(): false {
    return false;
  }

  getTextContent(): string {
    return "";
  }

  isInline(): boolean {
    return true;
  }

  decorate(_editor: LexicalEditor): JSX.Element {
    return (
      <UploadPlaceholderComponent uploadId={this.__uploadId} fileName={this.__fileName} kind={this.__kind} />
    );
  }
}

export function $createUploadPlaceholderNode(
  uploadId: string,
  fileName: string,
  kind: MediaKind,
): UploadPlaceholderNode {
  return new UploadPlaceholderNode(uploadId, fileName, kind);
}

export function $isUploadPlaceholderNode(
  node: LexicalNode | null | undefined,
): node is UploadPlaceholderNode {
  return node instanceof UploadPlaceholderNode;
}
