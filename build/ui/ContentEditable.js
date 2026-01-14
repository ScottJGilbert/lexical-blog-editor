import { jsx as _jsx } from "react/jsx-runtime";
import "./ContentEditable.css";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
export default function LexicalContentEditable({ className, placeholder, placeholderClassName, }) {
    return (_jsx(ContentEditable, { className: className !== null && className !== void 0 ? className : "ContentEditable__root", "aria-placeholder": placeholder, placeholder: _jsx("div", { className: placeholderClassName !== null && placeholderClassName !== void 0 ? placeholderClassName : "ContentEditable__placeholder", children: placeholder }) }));
}
