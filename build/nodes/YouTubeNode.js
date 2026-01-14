import { jsx as _jsx } from "react/jsx-runtime";
import { BlockWithAlignableContents } from "@lexical/react/LexicalBlockWithAlignableContents";
import { DecoratorBlockNode, } from "@lexical/react/LexicalDecoratorBlockNode";
function YouTubeComponent({ className, format, nodeKey, videoID, }) {
    return (_jsx(BlockWithAlignableContents, { className: className, format: format, nodeKey: nodeKey, children: _jsx("iframe", { width: "560", height: "315", src: `https://www.youtube-nocookie.com/embed/${videoID}`, frameBorder: "0", allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture", allowFullScreen: true, title: "YouTube video" }) }));
}
function $convertYoutubeElement(domNode) {
    const videoID = domNode.getAttribute("data-lexical-youtube");
    if (videoID) {
        const node = $createYouTubeNode(videoID);
        return { node };
    }
    return null;
}
export class YouTubeNode extends DecoratorBlockNode {
    static getType() {
        return "youtube";
    }
    static clone(node) {
        return new YouTubeNode(node.__id, node.__format, node.__key);
    }
    static importJSON(serializedNode) {
        return $createYouTubeNode(serializedNode.videoID).updateFromJSON(serializedNode);
    }
    exportJSON() {
        return Object.assign(Object.assign({}, super.exportJSON()), { videoID: this.__id });
    }
    constructor(id, format, key) {
        super(format, key);
        this.__id = id;
    }
    exportDOM() {
        const element = document.createElement("iframe");
        element.setAttribute("data-lexical-youtube", this.__id);
        element.setAttribute("width", "560");
        element.setAttribute("height", "315");
        element.setAttribute("src", `https://www.youtube-nocookie.com/embed/${this.__id}`);
        element.setAttribute("frameborder", "0");
        element.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture");
        element.setAttribute("allowfullscreen", "true");
        element.setAttribute("title", "YouTube video");
        return { element };
    }
    static importDOM() {
        return {
            iframe: (domNode) => {
                if (!domNode.hasAttribute("data-lexical-youtube")) {
                    return null;
                }
                return {
                    conversion: $convertYoutubeElement,
                    priority: 1,
                };
            },
        };
    }
    updateDOM() {
        return false;
    }
    getId() {
        return this.__id;
    }
    getTextContent(_includeInert, _includeDirectionless) {
        return `https://www.youtube.com/watch?v=${this.__id}`;
    }
    decorate(_editor, config) {
        const embedBlockTheme = config.theme.embedBlock || {};
        const className = {
            base: embedBlockTheme.base || "",
            focus: embedBlockTheme.focus || "",
        };
        return (_jsx(YouTubeComponent, { className: className, format: this.__format, nodeKey: this.getKey(), videoID: this.__id }));
    }
}
export function $createYouTubeNode(videoID) {
    return new YouTubeNode(videoID);
}
export function $isYouTubeNode(node) {
    return node instanceof YouTubeNode;
}
