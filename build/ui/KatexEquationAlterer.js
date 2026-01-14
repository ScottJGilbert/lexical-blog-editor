import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import "./KatexEquationAlterer.css";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useCallback, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import Button from "./Button";
import KatexRenderer from "./KatexRenderer";
export default function KatexEquationAlterer({ onConfirm, initialEquation = "", }) {
    const [editor] = useLexicalComposerContext();
    const [equation, setEquation] = useState(initialEquation);
    const [inline, setInline] = useState(true);
    const onClick = useCallback(() => {
        onConfirm(equation, inline);
    }, [onConfirm, equation, inline]);
    const onCheckboxChange = useCallback(() => {
        setInline(!inline);
    }, [setInline, inline]);
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "KatexEquationAlterer_defaultRow", children: ["Inline", _jsx("input", { type: "checkbox", checked: inline, onChange: onCheckboxChange })] }), _jsx("div", { className: "KatexEquationAlterer_defaultRow", children: "Equation " }), _jsx("div", { className: "KatexEquationAlterer_centerRow", children: inline ? (_jsx("input", { onChange: (event) => {
                        setEquation(event.target.value);
                    }, value: equation, className: "KatexEquationAlterer_textArea" })) : (_jsx("textarea", { onChange: (event) => {
                        setEquation(event.target.value);
                    }, value: equation, className: "KatexEquationAlterer_textArea" })) }), _jsx("div", { className: "KatexEquationAlterer_defaultRow", children: "Visualization " }), _jsx("div", { className: "KatexEquationAlterer_centerRow", children: _jsx(ErrorBoundary, { onError: (e) => editor._onError(e), fallback: null, children: _jsx(KatexRenderer, { equation: equation, inline: false, onDoubleClick: () => null }) }) }), _jsx("div", { className: "KatexEquationAlterer_dialogActions", children: _jsx(Button, { onClick: onClick, children: "Confirm" }) })] }));
}
