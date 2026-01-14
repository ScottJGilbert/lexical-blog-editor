/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
export const findFirstFocusableDescendant = (startElement) => {
    const focusableSelector = 'button, a[href], input, select, textarea, details, summary [tabindex], [contenteditable]';
    const focusableDescendants = startElement.querySelector(focusableSelector);
    return focusableDescendants;
};
export const focusNearestDescendant = (startElement) => {
    const el = findFirstFocusableDescendant(startElement);
    el === null || el === void 0 ? void 0 : el.focus();
    return el;
};
export const isKeyboardInput = (event) => {
    if ('pointerId' in event && 'pointerType' in event) {
        return event.pointerId === -1 && event.pointerType === '';
    }
    return (event === null || event === void 0 ? void 0 : event.detail) === 0;
};
