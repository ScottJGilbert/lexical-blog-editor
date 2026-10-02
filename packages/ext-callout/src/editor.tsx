"use client";

/**
 * Editor half: node, plugin and menu entries. Only import this in client code.
 *
 *   import { calloutEditor } from "@scottjgilbert/lexical-blog-editor-ext-callout/editor";
 *   <Editor extensions={[calloutEditor]} ... />
 */
import type { EditorExtension, EditorPluginProps } from "@scottjgilbert/lexical-blog-editor/editor";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $findMatchingParent, $insertNodeToNearestRoot, mergeRegister } from "@lexical/utils";
import {
  $applyNodeReplacement,
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  ElementNode,
  KEY_ARROW_DOWN_COMMAND,
  createCommand,
  type DOMConversionMap,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalCommand,
  type LexicalNode,
  type LexicalUpdateJSON,
  type NodeKey,
  type SerializedElementNode,
  type Spread,
} from "lexical";
import { useEffect } from "react";
import { CALLOUT_KINDS, CALLOUT_NODE_TYPE, normalizeCalloutKind, type CalloutKind } from "./shared";

export type SerializedCalloutNode = Spread<{ kind: CalloutKind }, SerializedElementNode>;

const classFor = (kind: CalloutKind) => `Callout Callout--${kind}`;

export class CalloutNode extends ElementNode {
  __kind: CalloutKind;

  static getType(): string {
    return CALLOUT_NODE_TYPE;
  }

  static clone(node: CalloutNode): CalloutNode {
    return new CalloutNode(node.__kind, node.__key);
  }

  constructor(kind: CalloutKind = "info", key?: NodeKey) {
    super(key);
    this.__kind = kind;
  }

  static importJSON(serialized: SerializedCalloutNode): CalloutNode {
    return $createCalloutNode(serialized.kind).updateFromJSON(serialized);
  }

  updateFromJSON(serialized: LexicalUpdateJSON<SerializedCalloutNode>): this {
    return super.updateFromJSON(serialized).setKind(normalizeCalloutKind(serialized.kind));
  }

  exportJSON(): SerializedCalloutNode {
    return { ...super.exportJSON(), kind: this.__kind };
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const element = document.createElement("aside");
    element.className = classFor(this.__kind);
    element.setAttribute("data-callout", this.__kind);
    return element;
  }

  updateDOM(prev: CalloutNode, dom: HTMLElement): boolean {
    if (prev.__kind !== this.__kind) {
      dom.className = classFor(this.__kind);
      dom.setAttribute("data-callout", this.__kind);
    }
    return false;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("aside");
    element.className = classFor(this.__kind);
    element.setAttribute("data-callout", this.__kind);
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      aside: (el) =>
        el.hasAttribute("data-callout")
          ? {
              conversion: (node) => ({
                node: $createCalloutNode(normalizeCalloutKind(node.getAttribute("data-callout"))),
              }),
              priority: 1,
            }
          : null,
    };
  }

  getKind(): CalloutKind {
    return this.getLatest().__kind;
  }

  setKind(kind: CalloutKind): this {
    const writable = this.getWritable();
    writable.__kind = kind;
    return this;
  }

  isShadowRoot(): boolean {
    return true;
  }

  canBeEmpty(): boolean {
    return false;
  }
}

export function $createCalloutNode(kind: CalloutKind = "info"): CalloutNode {
  return $applyNodeReplacement(new CalloutNode(kind));
}

export function $isCalloutNode(node: LexicalNode | null | undefined): node is CalloutNode {
  return node instanceof CalloutNode;
}

export const INSERT_CALLOUT_COMMAND: LexicalCommand<{ kind?: CalloutKind } | undefined> =
  createCommand("INSERT_CALLOUT_COMMAND");

export function CalloutPlugin(_props: EditorPluginProps): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([CalloutNode])) {
      throw new Error("CalloutPlugin: CalloutNode is not registered. Install the extension through <Editor extensions>.");
    }
    return mergeRegister(
      editor.registerCommand(
        INSERT_CALLOUT_COMMAND,
        (payload) => {
          const callout = $createCalloutNode(payload?.kind ?? "info");
          callout.append($createParagraphNode());
          $insertNodeToNearestRoot(callout);
          callout.getFirstChild()?.selectStart();
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      // A callout can never be empty: give it a paragraph back.
      editor.registerNodeTransform(CalloutNode, (node) => {
        if (node.isEmpty()) node.append($createParagraphNode());
      }),
      // ArrowDown at the very end of a trailing callout escapes below it.
      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND,
        () => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
          const callout = $findMatchingParent(selection.anchor.getNode(), $isCalloutNode);
          if (!callout || callout.getNextSibling() !== null) return false;
          const last = callout.getLastDescendant();
          if (last && selection.anchor.key === last.getKey() && selection.anchor.offset === last.getTextContentSize()) {
            callout.insertAfter($createParagraphNode());
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor]);

  return null;
}

const label = (kind: CalloutKind) => kind[0].toUpperCase() + kind.slice(1);

export const calloutEditor = {
  name: "@scottjgilbert/lexical-blog-editor-ext-callout",
  nodes: [CalloutNode],
  plugins: [CalloutPlugin],
  slashMenu: CALLOUT_KINDS.map((kind) => ({
    title: `${label(kind)} Callout`,
    keywords: ["callout", "note", "admonition", "alert", kind],
    onSelect: ({ editor }) => void editor.dispatchCommand(INSERT_CALLOUT_COMMAND, { kind }),
  })),
  insertMenu: [
    {
      title: "Callout",
      onSelect: ({ editor }) => void editor.dispatchCommand(INSERT_CALLOUT_COMMAND, { kind: "info" }),
    },
  ],
} satisfies EditorExtension;

export { CALLOUT_KINDS, CALLOUT_NODE_TYPE } from "./shared";
export type { CalloutKind } from "./shared";
