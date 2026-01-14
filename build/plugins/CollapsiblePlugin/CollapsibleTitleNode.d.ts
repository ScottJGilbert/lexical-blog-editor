/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { DOMConversionOutput, EditorConfig, ElementNode, LexicalEditor, LexicalNode, RangeSelection } from 'lexical';
export declare function $convertSummaryElement(domNode: HTMLElement): DOMConversionOutput | null;
/** @noInheritDoc */
export declare class CollapsibleTitleNode extends ElementNode {
    /** @internal */
    $config(): import("lexical").StaticNodeConfigRecord<"collapsible-title", {
        $transform(node: CollapsibleTitleNode): void;
        extends: typeof ElementNode;
        importDOM: import("lexical").DOMConversionMap<HTMLElement>;
    }>;
    createDOM(config: EditorConfig, editor: LexicalEditor): HTMLElement;
    updateDOM(prevNode: this, dom: HTMLElement): boolean;
    insertNewAfter(_: RangeSelection, restoreSelection?: boolean): ElementNode;
}
export declare function $createCollapsibleTitleNode(): CollapsibleTitleNode;
export declare function $isCollapsibleTitleNode(node: LexicalNode | null | undefined): node is CollapsibleTitleNode;
//# sourceMappingURL=CollapsibleTitleNode.d.ts.map