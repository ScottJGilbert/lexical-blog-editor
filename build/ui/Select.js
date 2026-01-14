var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import "./Select.css";
export default function Select(_a) {
    var { children, label, className } = _a, other = __rest(_a, ["children", "label", "className"]);
    return (_jsxs("div", { className: "Input__wrapper", children: [_jsx("label", { style: { marginTop: "-1em" }, className: "Input__label", children: label }), _jsx("select", Object.assign({}, other, { className: className || "select", children: children }))] }));
}
