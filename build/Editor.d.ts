import { EditorState } from "lexical";
import React from "react";
import "./index.css";
export type EditorProps = {
    placeholder?: string;
    initialState?: EditorState;
    onChange: (state: EditorState) => void;
};
export declare const EditorComponent: ({ placeholder, onChange, }: {
    placeholder?: string;
    onChange: (state: EditorState) => void;
}) => import("react/jsx-runtime").JSX.Element;
export declare const Editor: React.FC<EditorProps>;
//# sourceMappingURL=Editor.d.ts.map