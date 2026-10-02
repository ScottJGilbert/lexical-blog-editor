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

export interface VideoPayload {
  src: string;
  poster?: string;
  title?: string;
  width?: number;
  height?: number;
  controls?: boolean;
  loop?: boolean;
  muted?: boolean;
  autoplay?: boolean;
  mimeType?: string;
}

export type SerializedVideoNode = Spread<
  Required<Pick<VideoPayload, "src">> & Omit<VideoPayload, "src">,
  SerializedDecoratorBlockNode
>;

function $convertVideoElement(domNode: HTMLElement): null | DOMConversionOutput {
  const video = domNode as HTMLVideoElement;
  const src = video.getAttribute("src") || video.querySelector("source")?.getAttribute("src");
  if (!src) return null;
  return {
    node: $createVideoNode({
      src,
      poster: video.getAttribute("poster") || undefined,
      width: video.width || undefined,
      height: video.height || undefined,
      controls: video.hasAttribute("controls"),
      loop: video.hasAttribute("loop"),
      muted: video.hasAttribute("muted"),
    }),
  };
}

export class VideoNode extends DecoratorBlockNode {
  __payload: VideoPayload;

  static getType(): string {
    return "video";
  }

  static clone(node: VideoNode): VideoNode {
    return new VideoNode(node.__payload, node.__format, node.__key);
  }

  static importJSON(serialized: SerializedVideoNode): VideoNode {
    const { src, poster, title, width, height, controls, loop, muted, autoplay, mimeType } = serialized;
    return $createVideoNode({ src, poster, title, width, height, controls, loop, muted, autoplay, mimeType }).updateFromJSON(serialized);
  }

  exportJSON(): SerializedVideoNode {
    return { ...super.exportJSON(), ...this.__payload };
  }

  static importDOM(): DOMConversionMap | null {
    return { video: () => ({ conversion: $convertVideoElement, priority: 1 }) };
  }

  exportDOM(): DOMExportOutput {
    const p = this.__payload;
    const element = document.createElement("video");
    element.setAttribute("src", p.src);
    if (p.poster) element.setAttribute("poster", p.poster);
    if (p.controls !== false) element.setAttribute("controls", "");
    if (p.loop) element.setAttribute("loop", "");
    if (p.muted) element.setAttribute("muted", "");
    if (p.width) element.setAttribute("width", String(p.width));
    if (p.height) element.setAttribute("height", String(p.height));
    return { element };
  }

  constructor(payload: VideoPayload, format?: ElementFormatType, key?: NodeKey) {
    super(format, key);
    this.__payload = payload;
  }

  getSrc(): string {
    return this.__payload.src;
  }

  getTextContent(): string {
    return this.__payload.src;
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
        <video
          src={p.src}
          poster={p.poster}
          controls={p.controls !== false}
          loop={p.loop}
          muted={p.muted}
          width={p.width}
          height={p.height}
          preload="metadata"
          style={{ maxWidth: "100%" }}
        />
      </BlockWithAlignableContents>
    );
  }
}

export function $createVideoNode(payload: VideoPayload): VideoNode {
  return new VideoNode(payload);
}

export function $isVideoNode(node: LexicalNode | null | undefined): node is VideoNode {
  return node instanceof VideoNode;
}
