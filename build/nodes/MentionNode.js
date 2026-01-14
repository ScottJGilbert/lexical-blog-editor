/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { $applyNodeReplacement, TextNode, } from 'lexical';
function $convertMentionElement(domNode) {
    const textContent = domNode.textContent;
    const mentionName = domNode.getAttribute('data-lexical-mention-name');
    if (textContent !== null) {
        const node = $createMentionNode(typeof mentionName === 'string' ? mentionName : textContent, textContent);
        return {
            node,
        };
    }
    return null;
}
const mentionStyle = 'background-color: rgba(24, 119, 232, 0.2)';
export class MentionNode extends TextNode {
    static getType() {
        return 'mention';
    }
    static clone(node) {
        return new MentionNode(node.__mention, node.__text, node.__key);
    }
    static importJSON(serializedNode) {
        return $createMentionNode(serializedNode.mentionName).updateFromJSON(serializedNode);
    }
    constructor(mentionName, text, key) {
        super(text !== null && text !== void 0 ? text : mentionName, key);
        this.__mention = mentionName;
    }
    exportJSON() {
        return Object.assign(Object.assign({}, super.exportJSON()), { mentionName: this.__mention });
    }
    createDOM(config) {
        const dom = super.createDOM(config);
        dom.style.cssText = mentionStyle;
        dom.className = 'mention';
        dom.spellcheck = false;
        return dom;
    }
    exportDOM() {
        const element = document.createElement('span');
        element.setAttribute('data-lexical-mention', 'true');
        if (this.__text !== this.__mention) {
            element.setAttribute('data-lexical-mention-name', this.__mention);
        }
        element.textContent = this.__text;
        return { element };
    }
    static importDOM() {
        return {
            span: (domNode) => {
                if (!domNode.hasAttribute('data-lexical-mention')) {
                    return null;
                }
                return {
                    conversion: $convertMentionElement,
                    priority: 1,
                };
            },
        };
    }
    isTextEntity() {
        return true;
    }
    canInsertTextBefore() {
        return false;
    }
    canInsertTextAfter() {
        return false;
    }
}
export function $createMentionNode(mentionName, textContent) {
    const mentionNode = new MentionNode(mentionName, (textContent = mentionName));
    mentionNode.setMode('segmented').toggleDirectionless();
    return $applyNodeReplacement(mentionNode);
}
export function $isMentionNode(node) {
    return node instanceof MentionNode;
}
