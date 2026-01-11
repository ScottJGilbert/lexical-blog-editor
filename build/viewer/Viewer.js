import React from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { CodeNode, CodeHighlightNode } from '@lexical/code';
import { LinkNode } from '@lexical/link';
const theme = {
    paragraph: 'viewer-paragraph',
    quote: 'viewer-quote',
    heading: {
        h1: 'viewer-heading-h1',
        h2: 'viewer-heading-h2',
        h3: 'viewer-heading-h3',
        h4: 'viewer-heading-h4',
        h5: 'viewer-heading-h5',
        h6: 'viewer-heading-h6',
    },
    list: {
        nested: {
            listitem: 'viewer-nested-listitem',
        },
        ol: 'viewer-list-ol',
        ul: 'viewer-list-ul',
        listitem: 'viewer-listitem',
    },
    link: 'viewer-link',
    text: {
        bold: 'viewer-text-bold',
        italic: 'viewer-text-italic',
        underline: 'viewer-text-underline',
        strikethrough: 'viewer-text-strikethrough',
        code: 'viewer-text-code',
    },
    code: 'viewer-code',
};
export const Viewer = ({ content }) => {
    const initialConfig = {
        namespace: 'LexicalBlogViewer',
        theme,
        editable: false,
        onError: (error) => {
            console.error('Lexical error:', error);
        },
        nodes: [
            HeadingNode,
            QuoteNode,
            ListNode,
            ListItemNode,
            CodeNode,
            CodeHighlightNode,
            LinkNode,
        ],
        editorState: content,
    };
    return (React.createElement(LexicalComposer, { initialConfig: initialConfig },
        React.createElement("div", { className: "viewer-container" },
            React.createElement(RichTextPlugin, { contentEditable: React.createElement(ContentEditable, { className: "viewer-content" }), placeholder: null, ErrorBoundary: LexicalErrorBoundary }))));
};
export default Viewer;
