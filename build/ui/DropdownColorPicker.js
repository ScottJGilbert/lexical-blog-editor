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
import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import ColorPicker from "./ColorPicker";
import DropDown from "./DropDown";
export default function DropdownColorPicker(_a) {
    var { disabled = false, stopCloseOnClickSelf = true, color, onChange } = _a, rest = __rest(_a, ["disabled", "stopCloseOnClickSelf", "color", "onChange"]);
    return (_jsx(DropDown, Object.assign({}, rest, { disabled: disabled, stopCloseOnClickSelf: stopCloseOnClickSelf, children: _jsx(ColorPicker, { color: color, onChange: onChange }) })));
}
