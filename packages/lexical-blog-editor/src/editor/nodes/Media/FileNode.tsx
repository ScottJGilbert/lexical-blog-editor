import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  ElementFormatType,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  Spread,
} from "lexical";
import type { JSX } from "react";

import { BlockWithAlignableContents } from "@lexical/react/LexicalBlockWithAlignableContents";
import {
  DecoratorBlockNode,
  SerializedDecoratorBlockNode,
} from "@lexical/react/LexicalDecoratorBlockNode";

export interface FilePayload {
  src: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
}

export type SerializedFileNode = Spread<FilePayload, SerializedDecoratorBlockNode>;

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
}

function $convertFileElement(domNode: HTMLElement): null | DOMConversionOutput {
  if (!domNode.hasAttribute("data-lexical-file")) return null;
  const a = domNode.querySelector("a");
  const src = a?.getAttribute("href");
  if (!a || !src) return null;
  return { node: $createFileNode({ src, fileName: a.getAttribute("download") || a.textContent || "Download" }) };
}

export class FileNode extends DecoratorBlockNode {
  __payload: FilePayload;

  static getType(): string {
    return "file";
  }

  static clone(node: FileNode): FileNode {
    return new FileNode(node.__payload, node.__format, node.__key);
  }

  static importJSON(serialized: SerializedFileNode): FileNode {
    const { src, fileName, fileSize, mimeType } = serialized;
    return $createFileNode({ src, fileName, fileSize, mimeType }).updateFromJSON(serialized);
  }

  exportJSON(): SerializedFileNode {
    return { ...super.exportJSON(), ...this.__payload };
  }

  static importDOM(): DOMConversionMap | null {
    return { div: () => ({ conversion: $convertFileElement, priority: 1 }) };
  }

  exportDOM(): DOMExportOutput {
    const p = this.__payload;
    const element = document.createElement("div");
    element.setAttribute("data-lexical-file", "true");
    const a = document.createElement("a");
    a.setAttribute("href", p.src);
    a.setAttribute("download", p.fileName);
    a.textContent = p.fileName;
    element.append(a);
    return { element };
  }

  constructor(payload: FilePayload, format?: ElementFormatType, key?: NodeKey) {
    super(format, key);
    this.__payload = payload;
  }

  getTextContent(): string {
    return this.__payload.fileName;
  }

  updateDOM(): false {
    return false;
  }

  decorate(_editor: LexicalEditor, config: EditorConfig): JSX.Element {
    const embed = config.theme.embedBlock || {};
    const p = this.__payload;
    return (
      <BlockWithAlignableContents
        className={{ base: embed.base || "", focus: embed.focus || "" }}
        format={this.__format}
        nodeKey={this.getKey()}
      >
        <div className="LexicalBlogEditor__file">
          <span aria-hidden="true">📎</span>{" "}
          <a href={p.src} download={p.fileName} onClick={(e) => e.preventDefault()}>
            {p.fileName}
          </a>
          {p.fileSize ? <span className="LexicalBlogEditor__fileSize"> ({formatFileSize(p.fileSize)})</span> : null}
        </div>
      </BlockWithAlignableContents>
    );
  }
}

export function $createFileNode(payload: FilePayload): FileNode {
  return new FileNode(payload);
}

export function $isFileNode(node: LexicalNode | null | undefined): node is FileNode {
  return node instanceof FileNode;
}
