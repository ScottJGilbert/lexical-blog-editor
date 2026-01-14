import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import Button from '../../ui/Button';
import DropDown, { DropDownItem } from '../../ui/DropDown';
import { INSERT_LAYOUT_COMMAND } from './LayoutPlugin';
const LAYOUTS = [
    { label: '2 columns (equal width)', value: '1fr 1fr' },
    { label: '2 columns (25% - 75%)', value: '1fr 3fr' },
    { label: '3 columns (equal width)', value: '1fr 1fr 1fr' },
    { label: '3 columns (25% - 50% - 25%)', value: '1fr 2fr 1fr' },
    { label: '4 columns (equal width)', value: '1fr 1fr 1fr 1fr' },
];
export default function InsertLayoutDialog({ activeEditor, onClose, }) {
    var _a;
    const [layout, setLayout] = useState(LAYOUTS[0].value);
    const buttonLabel = (_a = LAYOUTS.find((item) => item.value === layout)) === null || _a === void 0 ? void 0 : _a.label;
    const onClick = () => {
        activeEditor.dispatchCommand(INSERT_LAYOUT_COMMAND, layout);
        onClose();
    };
    return (_jsxs(_Fragment, { children: [_jsx(DropDown, { buttonClassName: "toolbar-item dialog-dropdown", buttonLabel: buttonLabel, children: LAYOUTS.map(({ label, value }) => (_jsx(DropDownItem, { className: "item", onClick: () => setLayout(value), children: _jsx("span", { className: "text", children: label }) }, value))) }), _jsx(Button, { onClick: onClick, children: "Insert" })] }));
}
