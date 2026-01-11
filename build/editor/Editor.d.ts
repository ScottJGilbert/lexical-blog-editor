import React from 'react';
import { EditorState } from 'lexical';
export interface EditorProps {
    /** Callback fired when the editor state changes */
    onChange?: (editorState: EditorState) => void;
    /** Initial content for the editor (uncontrolled mode) - JSON string of serialized EditorState */
    initialContent?: string;
    /** Placeholder text displayed when the editor is empty */
    placeholder?: string;
    /** Current editor state for controlled mode - JSON string of serialized EditorState */
    editorState?: string;
}
export declare const Editor: React.FC<EditorProps>;
export default Editor;
//# sourceMappingURL=Editor.d.ts.map