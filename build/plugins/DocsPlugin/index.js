import { jsx as _jsx } from "react/jsx-runtime";
export default function DocsPlugin() {
    return (_jsx("a", { target: "__blank", href: "https://lexical.dev/docs/intro", children: _jsx("button", { id: "docs-button", className: "editor-dev-button", title: "Lexical Docs" }) }));
}
