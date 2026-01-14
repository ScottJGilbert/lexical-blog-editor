import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import './EquationEditor.css';
import { isHTMLElement } from 'lexical';
import { forwardRef } from 'react';
function EquationEditor({ equation, setEquation, inline }, forwardedRef) {
    const onChange = (event) => {
        setEquation(event.target.value);
    };
    return inline && isHTMLElement(forwardedRef) ? (_jsxs("span", { className: "EquationEditor_inputBackground", children: [_jsx("span", { className: "EquationEditor_dollarSign", children: "$" }), _jsx("input", { className: "EquationEditor_inlineEditor", value: equation, onChange: onChange, autoFocus: true, ref: forwardedRef }), _jsx("span", { className: "EquationEditor_dollarSign", children: "$" })] })) : (_jsxs("div", { className: "EquationEditor_inputBackground", children: [_jsx("span", { className: "EquationEditor_dollarSign", children: '$$\n' }), _jsx("textarea", { className: "EquationEditor_blockEditor", value: equation, onChange: onChange, ref: forwardedRef }), _jsx("span", { className: "EquationEditor_dollarSign", children: '\n$$' })] }));
}
export default forwardRef(EquationEditor);
