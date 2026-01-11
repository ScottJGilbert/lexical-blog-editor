import React from 'react';
import { EditorState } from 'lexical';
export interface EditorProps {
    onChange?: (editorState: EditorState) => void;
    initialContent?: string;
    placeholder?: string;
    editorState?: string;
}
export declare const Editor: React.FC<EditorProps>;
export default Editor;
//# sourceMappingURL=Editor.d.ts.map