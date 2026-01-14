import { jsx as _jsx } from "react/jsx-runtime";
import { BlockWithAlignableContents } from "@lexical/react/LexicalBlockWithAlignableContents";
import { DecoratorBlockNode, } from "@lexical/react/LexicalDecoratorBlockNode";
function FigmaComponent({ className, format, nodeKey, documentID, }) {
    return (_jsx(BlockWithAlignableContents, { className: className, format: format, nodeKey: nodeKey, children: _jsx("iframe", { width: "560", height: "315", src: `https://www.figma.com/embed?embed_host=lexical&url=\
        https://www.figma.com/file/${documentID}`, allowFullScreen: true }) }));
}
export class FigmaNode extends DecoratorBlockNode {
    static getType() {
        return "figma";
    }
    static clone(node) {
        return new FigmaNode(node.__id, node.__format, node.__key);
    }
    static importJSON(serializedNode) {
        return $createFigmaNode(serializedNode.documentID).updateFromJSON(serializedNode);
    }
    exportJSON() {
        return Object.assign(Object.assign({}, super.exportJSON()), { documentID: this.__id });
    }
    constructor(id, format, key) {
        super(format, key);
        this.__id = id;
    }
    updateDOM() {
        return false;
    }
    getId() {
        return this.__id;
    }
    getTextContent(_includeInert, _includeDirectionless) {
        return `https://www.figma.com/file/${this.__id}`;
    }
    decorate(_editor, config) {
        const embedBlockTheme = config.theme.embedBlock || {};
        const className = {
            base: embedBlockTheme.base || "",
            focus: embedBlockTheme.focus || "",
        };
        return (_jsx(FigmaComponent, { className: className, format: this.__format, nodeKey: this.getKey(), documentID: this.__id }));
    }
}
export function $createFigmaNode(documentID) {
    return new FigmaNode(documentID);
}
export function $isFigmaNode(node) {
    return node instanceof FigmaNode;
}
