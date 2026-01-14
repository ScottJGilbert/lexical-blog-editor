/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { type DOMConversionMap, type DOMExportOutput, type EditorConfig, type LexicalNode, type NodeKey, type SerializedTextNode, type Spread, TextNode } from 'lexical';
export type SerializedMentionNode = Spread<{
    mentionName: string;
}, SerializedTextNode>;
export declare class MentionNode extends TextNode {
    __mention: string;
    static getType(): string;
    static clone(node: MentionNode): MentionNode;
    static importJSON(serializedNode: SerializedMentionNode): MentionNode;
    constructor(mentionName: string, text?: string, key?: NodeKey);
    exportJSON(): SerializedMentionNode;
    createDOM(config: EditorConfig): HTMLElement;
    exportDOM(): DOMExportOutput;
    static importDOM(): DOMConversionMap | null;
    isTextEntity(): true;
    canInsertTextBefore(): boolean;
    canInsertTextAfter(): boolean;
}
export declare function $createMentionNode(mentionName: string, textContent?: string): MentionNode;
export declare function $isMentionNode(node: LexicalNode | null | undefined): node is MentionNode;
//# sourceMappingURL=MentionNode.d.ts.map