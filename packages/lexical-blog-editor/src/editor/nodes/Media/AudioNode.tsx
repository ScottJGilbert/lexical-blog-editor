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

export interface AudioPayload {
  src: string;
  title?: string;
  controls?: boolean;
  loop?: boolean;
  mimeType?: string;
}

export type SerializedAudioNode = Spread<
  Required<Pick<AudioPayload, "src">> & Omit<AudioPayload, "src">,
  SerializedDecoratorBlockNode
>;

function $convertAudioElement(domNode: HTMLElement): null | DOMConversionOutput {
  const audio = domNode as HTMLAudioElement;
  const src = audio.getAttribute("src") || audio.querySelector("source")?.getAttribute("src");
  if (!src) return null;
  return { node: $createAudioNode({ src, controls: audio.hasAttribute("controls"), loop: audio.hasAttribute("loop") }) };
}

export class AudioNode extends DecoratorBlockNode {
  __payload: AudioPayload;

  static getType(): string {
    return "audio";
  }

  static clone(node: AudioNode): AudioNode {
    return new AudioNode(node.__payload, node.__format, node.__key);
  }

  static importJSON(serialized: SerializedAudioNode): AudioNode {
    const { src, title, controls, loop, mimeType } = serialized;
    return $createAudioNode({ src, title, controls, loop, mimeType }).updateFromJSON(serialized);
  }

  exportJSON(): SerializedAudioNode {
    return { ...super.exportJSON(), ...this.__payload };
  }

  static importDOM(): DOMConversionMap | null {
    return { audio: () => ({ conversion: $convertAudioElement, priority: 1 }) };
  }

  exportDOM(): DOMExportOutput {
    const p = this.__payload;
    const element = document.createElement("audio");
    element.setAttribute("src", p.src);
    if (p.controls !== false) element.setAttribute("controls", "");
    if (p.loop) element.setAttribute("loop", "");
    return { element };
  }

  constructor(payload: AudioPayload, format?: ElementFormatType, key?: NodeKey) {
    super(format, key);
    this.__payload = payload;
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
        <audio src={p.src} controls={p.controls !== false} loop={p.loop} preload="metadata" style={{ width: "100%" }} />
      </BlockWithAlignableContents>
    );
  }
}

export function $createAudioNode(payload: AudioPayload): AudioNode {
  return new AudioNode(payload);
}

export function $isAudioNode(node: LexicalNode | null | undefined): node is AudioNode {
  return node instanceof AudioNode;
}
