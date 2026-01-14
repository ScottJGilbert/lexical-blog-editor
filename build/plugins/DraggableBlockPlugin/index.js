import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import './index.css';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { DraggableBlockPlugin_EXPERIMENTAL } from '@lexical/react/LexicalDraggableBlockPlugin';
import { $createParagraphNode, $createTextNode, $getNearestNodeFromDOMNode, $getNodeByKey, $isParagraphNode, $isTextNode, } from 'lexical';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as ReactDOM from 'react-dom';
import useModal from '../../hooks/useModal';
import { ComponentPickerMenuItem, getBaseOptions, getDynamicOptions, } from '../ComponentPickerPlugin';
const DRAGGABLE_BLOCK_MENU_CLASSNAME = 'draggable-block-menu';
function isOnMenu(element) {
    return !!element.closest(`.${DRAGGABLE_BLOCK_MENU_CLASSNAME}`);
}
export default function DraggableBlockPlugin({ anchorElem = document.body, }) {
    const [editor] = useLexicalComposerContext();
    const [modal, showModal] = useModal();
    const menuRef = useRef(null);
    const pickerRef = useRef(null);
    const searchInputRef = useRef(null);
    const targetLineRef = useRef(null);
    const [draggableElement, setDraggableElement] = useState(null);
    const [pickerState, setPickerState] = useState(null);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [queryString, setQueryString] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [pickerPosition, setPickerPosition] = useState(null);
    const options = useMemo(() => {
        const baseOptions = getBaseOptions(editor, showModal);
        if (!queryString) {
            return baseOptions;
        }
        const regex = new RegExp(queryString, 'i');
        return [
            ...getDynamicOptions(editor, queryString),
            ...baseOptions.filter((option) => regex.test(option.title) ||
                option.keywords.some((keyword) => regex.test(keyword))),
        ];
    }, [editor, queryString, showModal]);
    useEffect(() => {
        if (isPickerOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isPickerOpen]);
    useEffect(() => {
        if (!isPickerOpen || !options.length) {
            return;
        }
        setHighlightedIndex((current) => Math.min(current, Math.max(options.length - 1, 0)));
    }, [isPickerOpen, options.length]);
    useEffect(() => {
        if (!isPickerOpen) {
            return;
        }
        const handleClickOutside = (event) => {
            const target = event.target;
            if ((pickerRef.current && pickerRef.current.contains(target)) ||
                (menuRef.current && menuRef.current.contains(target))) {
                return;
            }
            setIsPickerOpen(false);
            setPickerState(null);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isPickerOpen]);
    const selectOption = useCallback((option) => {
        if (!pickerState) {
            setIsPickerOpen(false);
            return;
        }
        setIsPickerOpen(false);
        editor.update(() => {
            const node = $getNodeByKey(pickerState.targetNodeKey);
            if (!node) {
                return;
            }
            const placeholder = $createParagraphNode();
            const textNode = $createTextNode('');
            placeholder.append(textNode);
            if (pickerState.insertBefore) {
                node.insertBefore(placeholder);
            }
            else {
                node.insertAfter(placeholder);
            }
            textNode.select();
            option.onSelect(queryString);
            const latestPlaceholder = placeholder.getLatest();
            if ($isParagraphNode(latestPlaceholder)) {
                const onlyChild = latestPlaceholder.getFirstChild();
                if ($isTextNode(onlyChild) &&
                    onlyChild.getTextContent().length === 0 &&
                    latestPlaceholder.getChildrenSize() === 1) {
                    latestPlaceholder.remove();
                }
            }
        });
    }, [editor, pickerState, queryString]);
    useEffect(() => {
        if (!isPickerOpen) {
            return;
        }
        const handleKeyDown = (event) => {
            if (!isPickerOpen || !options.length) {
                return;
            }
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                setHighlightedIndex((index) => index + 1 >= options.length ? 0 : index + 1);
            }
            else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setHighlightedIndex((index) => index - 1 < 0 ? options.length - 1 : index - 1);
            }
            else if (event.key === 'Enter') {
                event.preventDefault();
                const option = options[highlightedIndex];
                if (option) {
                    selectOption(option);
                }
            }
            else if (event.key === 'Escape') {
                event.preventDefault();
                setIsPickerOpen(false);
                setPickerState(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [highlightedIndex, isPickerOpen, options, selectOption]);
    function openComponentPicker(e) {
        var _a;
        if (!draggableElement || !editor) {
            return;
        }
        let targetNodeKey = null;
        editor.read(() => {
            const resolvedNode = $getNearestNodeFromDOMNode(draggableElement);
            if (resolvedNode) {
                targetNodeKey = resolvedNode.getKey();
            }
        });
        if (!targetNodeKey) {
            return;
        }
        const insertBefore = e.altKey || e.ctrlKey;
        const rect = (_a = menuRef.current) === null || _a === void 0 ? void 0 : _a.getBoundingClientRect();
        setPickerPosition(rect
            ? {
                left: rect.left + rect.width + window.scrollX + 8,
                top: rect.top + window.scrollY,
            }
            : null);
        setPickerState({ insertBefore, targetNodeKey });
        setQueryString('');
        setHighlightedIndex(0);
        setIsPickerOpen(true);
    }
    return (_jsxs(_Fragment, { children: [modal, isPickerOpen && pickerPosition
                ? ReactDOM.createPortal(_jsxs("div", { className: "typeahead-popover component-picker-menu draggable-block-component-picker", ref: pickerRef, style: {
                        left: pickerPosition.left,
                        position: 'absolute',
                        top: pickerPosition.top,
                        zIndex: 10,
                    }, children: [_jsx("input", { className: "component-picker-search", placeholder: "Filter blocks...", value: queryString, ref: searchInputRef, onChange: (event) => setQueryString(event.target.value) }), _jsx("ul", { children: options.map((option, i) => (_jsx(ComponentPickerMenuItem, { index: i, isSelected: highlightedIndex === i, onClick: () => {
                                    setHighlightedIndex(i);
                                    selectOption(option);
                                }, onMouseEnter: () => setHighlightedIndex(i), option: option }, option.key))) })] }), document.body)
                : null, _jsx(DraggableBlockPlugin_EXPERIMENTAL, { anchorElem: anchorElem, menuRef: menuRef, targetLineRef: targetLineRef, menuComponent: _jsxs("div", { ref: menuRef, className: "icon draggable-block-menu", children: [_jsx("button", { title: "Click to add below", className: "icon icon-plus", onClick: openComponentPicker }), _jsx("div", { className: "icon" })] }), targetLineComponent: _jsx("div", { ref: targetLineRef, className: "draggable-block-target-line" }), isOnMenu: isOnMenu, onElementChanged: setDraggableElement })] }));
}
