/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { DOMConversionMap, DOMConversionOutput, DOMExportOutput, EditorConfig, ElementNode, LexicalEditor, LexicalNode, NodeKey, RangeSelection, SerializedElementNode, Spread } from 'lexical';
type SerializedCollapsibleContainerNode = Spread<{
    open: boolean;
}, SerializedElementNode>;
export declare function $convertDetailsElement(domNode: HTMLDetailsElement): DOMConversionOutput | null;
export declare class CollapsibleContainerNode extends ElementNode {
    __open: boolean;
    constructor(open: boolean, key?: NodeKey);
    static getType(): string;
    static clone(node: CollapsibleContainerNode): CollapsibleContainerNode;
    isShadowRoot(): boolean;
    collapseAtStart(selection: RangeSelection): boolean;
    createDOM(config: EditorConfig, editor: LexicalEditor): HTMLElement;
    updateDOM(prevNode: this, dom: HTMLDetailsElement): boolean;
    static importDOM(): DOMConversionMap<HTMLDetailsElement> | null;
    static importJSON(serializedNode: SerializedCollapsibleContainerNode): CollapsibleContainerNode;
    exportDOM(): DOMExportOutput;
    exportJSON(): SerializedCollapsibleContainerNode;
    setOpen(open: boolean): void;
    getOpen(): boolean;
    toggleOpen(): void;
}
export declare function $createCollapsibleContainerNode(isOpen: boolean): CollapsibleContainerNode;
export declare function $isCollapsibleContainerNode(node: LexicalNode | null | undefined): node is CollapsibleContainerNode;
export {};
//# sourceMappingURL=CollapsibleContainerNode.d.ts.map